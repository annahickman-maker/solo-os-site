import assert from "node:assert/strict";
import test from "node:test";
import { SALES_FUNNEL, cleanSiteEvent, salesFunnelRows } from "./site-events.ts";

const SESSION = "s_abcdef123456";

test("keeps allowed events and drops query strings from the page", () => {
  const event = cleanSiteEvent({
    event_type: "page_view",
    page_url: "https://example.com/thank-you?session_id=cs_secret#top",
    session_id: SESSION,
    event_data: { traffic_source: "direct", device_type: "mobile", nested: { no: 1 } },
  });
  assert.ok(event);
  assert.equal(event.page_url, "https://example.com/thank-you");
  assert.equal(event.page_slug, "/thank-you");
  assert.deepEqual(event.event_data, { traffic_source: "direct", device_type: "mobile" });
  assert.equal(JSON.stringify(event).includes("cs_secret"), false);
});

test("refuses unknown event types and malformed bodies", () => {
  assert.equal(cleanSiteEvent({ event_type: "purchase" }), null);
  assert.equal(cleanSiteEvent({}), null);
  assert.equal(cleanSiteEvent(null), null);
  assert.equal(cleanSiteEvent([]), null);
});

test("a bad session id is dropped, so no funnel rows are written", () => {
  const event = cleanSiteEvent({ event_type: "page_view", page_slug: "/", session_id: "x y" });
  assert.ok(event);
  assert.equal(event.session_id, null);
  assert.deepEqual(salesFunnelRows(event), []);
});

test("a home page view starts the sales-page funnel", () => {
  const rows = salesFunnelRows(cleanSiteEvent({ event_type: "page_view", page_slug: "/", session_id: SESSION })!);
  assert.deepEqual(rows.map((r) => [r.funnel, r.event_type, r.screen_id, r.screen_index]), [
    [SALES_FUNNEL, "start", null, null],
    [SALES_FUNNEL, "view", "sales-page", 0],
  ]);
});

test("checkout and thank-you are the later steps", () => {
  const checkout = salesFunnelRows(cleanSiteEvent({ event_type: "checkout_start", page_slug: "/", session_id: SESSION })!);
  assert.deepEqual(checkout.map((r) => [r.event_type, r.screen_id, r.screen_index]), [["view", "checkout", 1]]);
  const thanks = salesFunnelRows(cleanSiteEvent({ event_type: "page_view", page_slug: "/thank-you", session_id: SESSION })!);
  assert.deepEqual(thanks.map((r) => [r.event_type, r.screen_id, r.screen_index]), [["view", "thank-you", 2]]);
});

test("clicks carry their button, captures are opt-ins, other pages add nothing", () => {
  const click = salesFunnelRows(cleanSiteEvent({ event_type: "cta_click", event_data: { cta_id: "hero" }, session_id: SESSION })!);
  assert.deepEqual(click.map((r) => [r.event_type, r.event_data.location]), [["cta_click", "hero"]]);
  const capture = salesFunnelRows(cleanSiteEvent({ event_type: "email_capture", session_id: SESSION })!);
  assert.deepEqual(capture.map((r) => r.event_type), ["complete"]);
  assert.deepEqual(salesFunnelRows(cleanSiteEvent({ event_type: "page_view", page_slug: "/privacy", session_id: SESSION })!), []);
  assert.deepEqual(salesFunnelRows(cleanSiteEvent({ event_type: "scroll_depth", session_id: SESSION })!), []);
});

test("offer and content ids are kept only when they are uuids", () => {
  const ok = cleanSiteEvent({ event_type: "offer_view", offer_id: "0b6f6a4e-7a8b-4c1d-9e2f-3a4b5c6d7e8f", content_id: "hero" })!;
  assert.equal(ok.offer_id, "0b6f6a4e-7a8b-4c1d-9e2f-3a4b5c6d7e8f");
  assert.equal(ok.content_id, null);
});
