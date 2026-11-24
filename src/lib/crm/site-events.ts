/**
 * Visitor events from the sales page (pure, no database access).
 *
 * The browser tracker (src/lib/analytics/tracker.ts, mounted on every page by
 * src/components/site/PageTracker.tsx) posts each event to this site's
 * POST /api/analytics. That route keeps only what cleanSiteEvent() allows and
 * writes it to `analytics_events`, which the dashboard's Analytics > Website
 * report reads (page_view = views, cta_click / offer_click = clicks,
 * email_capture = captures).
 *
 * The same events also feed the dashboard's Funnels report as the
 * "sales-page" funnel in `funnel_events` (salesFunnelRows()):
 *   page_view of /           -> start + step "sales-page" (0)
 *   checkout_start           -> step "checkout" (1)
 *   page_view of /thank-you  -> step "thank-you" (2)
 *   cta_click / offer_click  -> cta_click (location = the button)
 *   email_capture            -> complete (an opt-in)
 * The dashboard counts distinct sessions per step, so a repeated event in one
 * session never inflates a step. Its Reach number counts this funnel through
 * page_view events only, never twice.
 */

export const SALES_FUNNEL = "sales-page";

export const SITE_EVENT_TYPES = [
  "page_view",
  "cta_click",
  "offer_click",
  "email_capture",
  "checkout_start",
  "offer_view",
  "scroll_depth",
  "time_on_page",
] as const;
export type SiteEventType = (typeof SITE_EVENT_TYPES)[number];

export type SiteEvent = {
  event_type: SiteEventType;
  event_data: Record<string, string | number | boolean | null>;
  page_url: string | null;
  page_slug: string | null;
  session_id: string | null;
  offer_id: string | null;
  content_id: string | null;
};

export type SalesFunnelRow = {
  funnel: string;
  session_id: string;
  event_type: "start" | "view" | "complete" | "cta_click";
  screen_index: number | null;
  screen_id: string | null;
  event_data: Record<string, string | number | boolean | null>;
  page_url: string | null;
};

const MAX_DATA_KEYS = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : null;
}

/** A path with no query or fragment, so tokens like Stripe's ?session_id= are never stored. */
export function cleanPath(value: unknown): string | null {
  const raw = str(value, 500);
  if (!raw) return null;
  try {
    const path = new URL(raw, "https://site.invalid").pathname;
    return path.slice(0, 300) || "/";
  } catch {
    return null;
  }
}

/** A page URL with the query and fragment dropped. */
export function cleanUrl(value: unknown): string | null {
  const raw = str(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

function uuidOrNull(value: unknown): string | null {
  const v = str(value, 36);
  return v && UUID.test(v) ? v : null;
}

/** Only flat, short values survive in event_data. */
function cleanData(value: unknown): SiteEvent["event_data"] {
  const out: SiteEvent["event_data"] = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, v] of Object.entries(value as Record<string, unknown>).slice(0, MAX_DATA_KEYS)) {
    const k = key.slice(0, 40);
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

/** The event the route may store, or null for an unknown type or a malformed body. */
export function cleanSiteEvent(body: unknown): SiteEvent | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const type = str(b.event_type, 40);
  if (!type || !(SITE_EVENT_TYPES as readonly string[]).includes(type)) return null;
  const page_slug = cleanPath(b.page_slug) ?? cleanPath(b.page_url);
  const session = str(b.session_id, 100);
  return {
    event_type: type as SiteEventType,
    event_data: cleanData(b.event_data),
    page_url: cleanUrl(b.page_url),
    page_slug,
    session_id: session && /^[A-Za-z0-9_-]{8,100}$/.test(session) ? session : null,
    // Both columns are uuids: anything else is dropped rather than failing the insert.
    offer_id: uuidOrNull(b.offer_id),
    content_id: uuidOrNull(b.content_id),
  };
}

/** The "sales-page" funnel rows one event adds (none without a session id). */
export function salesFunnelRows(event: SiteEvent): SalesFunnelRow[] {
  const session_id = event.session_id;
  if (!session_id) return [];
  const base = { funnel: SALES_FUNNEL, session_id, page_url: event.page_url };
  const step = (screen_id: string, screen_index: number): SalesFunnelRow => ({
    ...base, event_type: "view", screen_id, screen_index, event_data: { screen_id, screen_index },
  });
  switch (event.event_type) {
    case "page_view":
      if (event.page_slug === "/") {
        return [{ ...base, event_type: "start", screen_id: null, screen_index: null, event_data: {} }, step("sales-page", 0)];
      }
      if (event.page_slug === "/thank-you") return [step("thank-you", 2)];
      return [];
    case "checkout_start":
      return [step("checkout", 1)];
    case "cta_click":
    case "offer_click": {
      const location = typeof event.event_data.cta_id === "string" ? event.event_data.cta_id : event.offer_id ?? "unknown";
      return [{ ...base, event_type: "cta_click", screen_id: null, screen_index: null, event_data: { location } }];
    }
    case "email_capture":
      return [{ ...base, event_type: "complete", screen_id: null, screen_index: null, event_data: {} }];
    default:
      return [];
  }
}
