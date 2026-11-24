/**
 * POST /api/checkout - { productSlug, email? } → { url } | { error: code }
 *
 * The sales page's checkout buttons. Accepts only a product slug that a
 * checkout button in site.config.ts sells, rate-limits each caller, and asks
 * the dashboard to open a Stripe Checkout Session (POST /api/crm/checkout),
 * signed with CHECKOUT_API_KEY, through the BACKEND_WORKER service binding
 * (plain HTTP to BACKEND_URL locally). The dashboard prices the product; no
 * price is read from the browser. Stripe returns the buyer to /thank-you, or
 * to /#offer when they cancel. See README "Checkout".
 *
 * Error codes for the button: invalid, not_sold_here, rate_limited,
 * not_configured (503), unavailable, error.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { backendFetch } from "@/lib/crm/capture-backend";
import { checkoutViaBackend, createRateLimiter, MAX_BODY_BYTES, parseCheckoutRequest } from "@/lib/crm/checkout-backend";
import { checkoutSlugs } from "@/lib/cta";
import { siteConfig } from "@/site.config";

// Ten checkout attempts per caller per ten minutes, per Worker isolate.
const allow = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

const NO_STORE = { "Cache-Control": "no-store" };

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/** This site's own origin, for Stripe's return URLs: the configured one, else the request's. */
function siteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  // A browser on another site cannot start checkouts here.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && origin !== siteOrigin(request)) return fail(403, "invalid");

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return fail(413, "invalid");

  const caller = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(caller)) return fail(429, "rate_limited");

  const parsed = parseCheckoutRequest(await request.text(), checkoutSlugs(siteConfig));
  if (!parsed.ok) return fail(parsed.status, parsed.code);

  let binding: CloudflareEnv["BACKEND_WORKER"];
  try {
    binding = getCloudflareContext().env.BACKEND_WORKER;
  } catch {
    // Local Next.js or non-Cloudflare hosting has no Workers context.
  }
  const outcome = await checkoutViaBackend(
    { productSlug: parsed.productSlug, email: parsed.email, siteOrigin: siteOrigin(request) },
    { backendUrl: process.env.BACKEND_URL, checkoutKey: process.env.CHECKOUT_API_KEY, fetchImpl: backendFetch(binding) }
  );
  if (!outcome.ok) {
    // The reason stays in the Worker log; the buyer sees a plain message.
    console.error("[checkout]", parsed.productSlug, outcome.code, outcome.detail || "");
    return fail(outcome.status, outcome.code);
  }
  return NextResponse.json({ url: outcome.url }, { headers: NO_STORE });
}
