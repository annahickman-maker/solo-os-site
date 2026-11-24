/**
 * Checkout from the sales page: the pure half of POST /api/checkout.
 *
 * The browser sends only { productSlug, email? }. This checks it, then asks
 * the dashboard's POST /api/crm/checkout to open a Stripe Checkout Session,
 * signed with CHECKOUT_API_KEY (a minted dashboard key holding only
 * money:checkout). The price always comes from the dashboard's product,
 * never from the browser. The return URLs are built here from the site's own
 * origin, never taken from the request body.
 *
 * No framework imports, so `node --test` runs it with a fake binding.
 */

import type { FetchImplementation } from "./capture-backend.ts";

/** What the buyer's browser is told. `code` picks the message in site.config.ts. */
export type CheckoutOutcome =
  | { ok: true; url: string }
  | { ok: false; status: number; code: CheckoutErrorCode; detail?: string };

export type CheckoutErrorCode =
  | "invalid" // the request itself is wrong
  | "not_sold_here" // a slug this page has no button for
  | "rate_limited"
  | "not_configured" // Stripe or the site's checkout key is not set up yet
  | "unavailable" // the product cannot be bought right now
  | "error"; // anything else: the dashboard is down, Stripe failed

export const MAX_BODY_BYTES = 2048;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validates the browser's body: only productSlug and an optional email, nothing else is read. */
export function parseCheckoutRequest(
  raw: string,
  allowedSlugs: readonly string[]
): { ok: true; productSlug: string; email: string | null } | Extract<CheckoutOutcome, { ok: false }> {
  if (raw.length > MAX_BODY_BYTES) return { ok: false, status: 413, code: "invalid", detail: "body too large" };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, code: "invalid", detail: "body is not JSON" };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, status: 400, code: "invalid", detail: "body is not an object" };
  const { productSlug, email } = body as Record<string, unknown>;
  if (typeof productSlug !== "string" || productSlug.length > 60 || !SLUG_RE.test(productSlug)) {
    return { ok: false, status: 400, code: "invalid", detail: "productSlug is not a product slug" };
  }
  // Only products this page has a checkout button for: the site is not an
  // open door to every product in the dashboard.
  if (!allowedSlugs.includes(productSlug)) return { ok: false, status: 404, code: "not_sold_here" };
  if (email === undefined || email === null || email === "") return { ok: true, productSlug, email: null };
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return { ok: false, status: 400, code: "invalid", detail: "email is not valid" };
  }
  return { ok: true, productSlug, email: email.trim().toLowerCase() };
}

/**
 * A small sliding-window limit per caller. Best effort: each Worker isolate
 * keeps its own memory, so it slows a script down rather than stopping a
 * determined one. Add a Cloudflare rate limiting rule on /api/checkout for
 * a hard limit (README).
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();
  const maxKeys = opts.maxKeys ?? 5000;
  return (key: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(key) || []).filter((t) => now - t < opts.windowMs);
    if (recent.length >= opts.limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.delete(key);
    hits.set(key, recent);
    // Forget the oldest callers rather than grow without bound.
    while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
    return true;
  };
}

/** Same as the dashboard's lib/api/signing.ts: hex HMAC-SHA256 of METHOD:path:timestamp:body. */
export async function signRequest(key: string, method: string, path: string, timestamp: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const hmacKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", hmacKey, enc.encode([method.toUpperCase(), path, timestamp, body].join(":")));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const CHECKOUT_PATH = "/api/crm/checkout";

/** Where Stripe sends the buyer: the thank-you page with Stripe's session placeholder, or back to the offer. */
export function returnUrls(siteOrigin: string): { success_url: string; cancel_url: string } {
  const origin = siteOrigin.replace(/\/+$/, "");
  return {
    success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#offer`,
  };
}

/** Asks the dashboard for a Checkout Session. Never retried over public HTTP when the binding fails. */
export async function checkoutViaBackend(
  input: { productSlug: string; email: string | null; siteOrigin: string },
  config: {
    backendUrl?: string;
    checkoutKey?: string;
    fetchImpl?: FetchImplementation;
    nowSeconds?: number;
  }
): Promise<CheckoutOutcome> {
  const { backendUrl, checkoutKey, fetchImpl = fetch } = config;
  if (!backendUrl || !checkoutKey) {
    const missing = [!backendUrl && "BACKEND_URL", !checkoutKey && "CHECKOUT_API_KEY"].filter(Boolean).join(" and ");
    return { ok: false, status: 503, code: "not_configured", detail: `checkout is not configured (missing ${missing})` };
  }

  const body = JSON.stringify({
    product_slug: input.productSlug,
    ...(input.email ? { email: input.email } : {}),
    ...returnUrls(input.siteOrigin),
  });
  const timestamp = String(config.nowSeconds ?? Math.floor(Date.now() / 1000));
  const signature = await signRequest(checkoutKey, "POST", CHECKOUT_PATH, timestamp, body);

  let response: Response;
  try {
    response = await fetchImpl(`${backendUrl.replace(/\/+$/, "")}${CHECKOUT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": checkoutKey,
        "x-timestamp": timestamp,
        "x-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { ok: false, status: 502, code: "error", detail: `dashboard unreachable: ${error instanceof Error ? error.message : String(error)}` };
  }
  const data = (await response.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
  const detail = `dashboard answered ${response.status}${typeof data.error === "string" ? `: ${data.error}` : ""}`;

  if (response.ok) {
    if (typeof data.url === "string" && /^https:\/\//.test(data.url)) return { ok: true, url: data.url };
    return { ok: false, status: 502, code: "error", detail: "dashboard returned no https checkout URL" };
  }
  // 503: Stripe keys or webhook secret not set. 401/403: the site's key is
  // wrong, revoked or lacks money:checkout. Either way checkout is not on yet.
  if (response.status === 503 || response.status === 401 || response.status === 403) {
    return { ok: false, status: 503, code: "not_configured", detail };
  }
  // 404: no active product with that slug. 400/409: the product cannot be
  // sold at checkout (an invoice item, a price mismatch, a digital product
  // with no delivery link).
  if (response.status === 404 || response.status === 400 || response.status === 409) {
    return { ok: false, status: 409, code: "unavailable", detail };
  }
  return { ok: false, status: 502, code: "error", detail };
}
