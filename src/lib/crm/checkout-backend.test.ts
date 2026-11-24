import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { backendFetch } from "./capture-backend.ts";
import { checkoutViaBackend, createRateLimiter, parseCheckoutRequest, returnUrls } from "./checkout-backend.ts";
import { checkoutSlugs } from "../cta.ts";
import { siteConfig } from "../../site.config.ts";

// Fabricated: not a real key.
const KEY = "test_checkout_key_fabricated";
const SITE = "https://site.example.com";
const BACKEND = "https://dashboard.example.workers.dev";
const NOW = 1_761_500_000;

/** A fake BACKEND_WORKER binding that records what it was sent and answers like the dashboard. */
function fakeBinding(answer: (init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const binding = {
    async fetch(input: string | URL | Request, init?: RequestInit) {
      // Called with its receiver intact (backendFetch binds it).
      assert.equal(this, binding);
      calls.push({ url: String(input), init: init! });
      return answer(init!);
    },
  };
  return { binding, calls };
}

const request = (fetchImpl: ReturnType<typeof backendFetch>, over: { checkoutKey?: string; backendUrl?: string } = {}) =>
  checkoutViaBackend(
    { productSlug: "main-offer", email: null, siteOrigin: `${SITE}/` },
    { backendUrl: BACKEND, checkoutKey: KEY, fetchImpl, nowSeconds: NOW, ...over }
  );

test("checkout goes through the bound dashboard Worker, signed with the checkout key, with only the slug and the site's own return URLs", async () => {
  const fake = fakeBinding(() => Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_1", order_id: "o1", session_id: "cs_test_1" }, { status: 201 }));
  const out = await request(backendFetch(fake.binding));
  assert.deepEqual(out, { ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1" });

  assert.equal(fake.calls.length, 1);
  const { url, init } = fake.calls[0];
  assert.equal(url, `${BACKEND}/api/crm/checkout`);
  assert.equal(init.method, "POST");
  const headers = new Headers(init.headers);
  assert.equal(headers.get("x-api-key"), KEY);
  assert.equal(headers.get("x-timestamp"), String(NOW));
  // The dashboard's lib/api/signing.ts scheme: hex HMAC-SHA256(key, METHOD:path:timestamp:body).
  const expected = createHmac("sha256", KEY).update(`POST:/api/crm/checkout:${NOW}:${init.body}`).digest("hex");
  assert.equal(headers.get("x-signature"), expected);

  const body = JSON.parse(String(init.body));
  assert.deepEqual(body, {
    product_slug: "main-offer",
    success_url: `${SITE}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/#offer`,
  });
  assert.ok(!("amount_minor" in body) && !("price" in body), "no price ever leaves the site");
});

test("the browser's body: only productSlug and email are read; prices and return URLs it sends are ignored", () => {
  const parsed = parseCheckoutRequest(
    JSON.stringify({ productSlug: "main-offer", email: " Bea@Example.com ", amount_minor: 1, price: "$1", success_url: "https://evil.example.com" }),
    ["main-offer"]
  );
  assert.deepEqual(parsed, { ok: true, productSlug: "main-offer", email: "bea@example.com" });
});

test("abusive or broken payloads are refused before the dashboard is called", () => {
  const allowed = ["main-offer"];
  const code = (raw: string) => {
    const r = parseCheckoutRequest(raw, allowed);
    return r.ok ? "ok" : `${r.status} ${r.code}`;
  };
  assert.equal(code("not json"), "400 invalid");
  assert.equal(code("[]"), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "Main Offer" })), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "a".repeat(61) })), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: 42 })), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "secret-product" })), "404 not_sold_here");
  assert.equal(code(JSON.stringify({ productSlug: "main-offer", email: "nope" })), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "main-offer", email: `${"a".repeat(250)}@x.co` })), "400 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "main-offer", pad: "x".repeat(3000) })), "413 invalid");
  assert.equal(code(JSON.stringify({ productSlug: "main-offer", email: "" })), "ok");
});

test("dashboard answers map to clear button states", async () => {
  const cases: Array<[number, unknown, string]> = [
    [503, { error: "Stripe is not configured" }, "not_configured"],
    [401, { error: "Invalid x-signature" }, "not_configured"],
    [403, { error: "Forbidden" }, "not_configured"],
    [404, { error: "No active product with that slug" }, "unavailable"],
    [409, { error: "price mismatch" }, "unavailable"],
    [400, { error: "invoice_item products are billed on invoices" }, "unavailable"],
    [500, { error: "boom" }, "error"],
    [201, { url: "http://checkout.example.com/not-https" }, "error"],
  ];
  for (const [status, payload, expected] of cases) {
    const fake = fakeBinding(() => Response.json(payload, { status }));
    const out = await request(backendFetch(fake.binding));
    assert.equal(out.ok, false, `status ${status}`);
    if (!out.ok) assert.equal(out.code, expected, `status ${status}`);
  }
});

test("without CHECKOUT_API_KEY or BACKEND_URL nothing is sent and checkout is reported as not switched on", async () => {
  const fake = fakeBinding(() => Response.json({}));
  const noKey = await request(backendFetch(fake.binding), { checkoutKey: "" });
  const noUrl = await request(backendFetch(fake.binding), { backendUrl: "" });
  for (const out of [noKey, noUrl]) {
    assert.equal(out.ok, false);
    if (!out.ok) assert.deepEqual([out.status, out.code], [503, "not_configured"]);
  }
  assert.equal(fake.calls.length, 0);
});

test("a failed bound call is an error, with no retry over public HTTP", async () => {
  const fake = fakeBinding(() => {
    throw new Error("binding unavailable");
  });
  const out = await request(backendFetch(fake.binding));
  assert.equal(out.ok, false);
  if (!out.ok) {
    assert.equal(out.code, "error");
    assert.match(out.detail!, /binding unavailable/);
  }
  assert.equal(fake.calls.length, 1);
});

test("the rate limiter allows a burst per caller, then refuses until the window passes", () => {
  const allow = createRateLimiter({ limit: 3, windowMs: 60_000, maxKeys: 2 });
  const t = 1_000_000;
  assert.deepEqual([allow("a", t), allow("a", t), allow("a", t), allow("a", t)], [true, true, true, false]);
  assert.equal(allow("b", t), true, "another caller has its own budget");
  assert.equal(allow("a", t + 60_001), true);
  allow("c", t);
  allow("d", t);
  assert.equal(allow("a", t + 60_002), true, "memory stays bounded: the oldest callers are forgotten");
});

test("the placeholder site sells one product at checkout, and the return URLs never carry order details", () => {
  assert.deepEqual(checkoutSlugs(siteConfig), ["main-offer"]);
  const kinds = siteConfig.offer.plans.map((p) => p.cta.action.type);
  assert.deepEqual(kinds, ["lead", "checkout", "booking"]);
  const urls = returnUrls("https://site.example.com");
  assert.equal(new URL(urls.success_url).searchParams.get("session_id"), "{CHECKOUT_SESSION_ID}");
  assert.equal(new URL(urls.cancel_url).hash, "#offer");
});
