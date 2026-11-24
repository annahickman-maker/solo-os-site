/**
 * POST /api/analytics - Log a visitor event from the browser tracker
 * GET /api/analytics - Query events (auth required)
 *
 * POST body (see src/lib/crm/site-events.ts for what is kept):
 * {
 *   event_type: page_view | cta_click | offer_click | email_capture |
 *               checkout_start | offer_view | scroll_depth | time_on_page,
 *   event_data?: flat object,
 *   page_url?: string, page_slug?: string, session_id?: string,
 *   content_id?: string, offer_id?: string
 * }
 *
 * Writes the event to analytics_events (the dashboard's Website report) and,
 * for the steps of the sales page, to funnel_events as the "sales-page"
 * funnel (the dashboard's Funnels report). Query strings are never stored.
 * The anonymous_id and visitor_segment are read from cookies set by the
 * middleware.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api/auth";
import { jsonResponse, errorResponse, parsePagination, paginatedResponse } from "@/lib/api/response";
import { VISITOR_COOKIE_NAME } from "@/lib/personalization/visitor";
import { cleanSiteEvent, salesFunnelRows } from "@/lib/crm/site-events";

const MAX_BODY_BYTES = 8_000;

export async function POST(request: NextRequest) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY_BYTES) return errorResponse("invalid event");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse("invalid event");
  }
  const event = cleanSiteEvent(body);
  if (!event) return errorResponse("invalid event");

  // Get visitor identity from middleware-set cookie
  const anonymousId = request.cookies.get(VISITOR_COOKIE_NAME)?.value || "unknown";
  const visitorSegment = request.cookies.get("so_segment")?.value || null;

  const supabase = createAdminClient();
  const { error } = await supabase.from("analytics_events").insert({
    anonymous_id: anonymousId,
    event_type: event.event_type,
    event_data: event.event_data,
    page_url: event.page_url,
    page_slug: event.page_slug,
    referrer: request.headers.get("referer")?.split("?")[0]?.slice(0, 500) || null,
    content_id: event.content_id,
    offer_id: event.offer_id,
    visitor_segment: visitorSegment,
  });

  if (error) return errorResponse(error.message, 500);

  const funnelRows = salesFunnelRows(event);
  if (funnelRows.length) {
    const { error: funnelError } = await supabase.from("funnel_events").insert(funnelRows);
    if (funnelError) console.error("[analytics] funnel insert failed:", funnelError.message);
  }

  return jsonResponse({ ok: true }, 201);
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return unauthorizedResponse(auth.error);

  const { searchParams } = request.nextUrl;
  const { page, limit, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();
  let query = supabase
    .from("analytics_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const eventType = searchParams.get("event_type");
  if (eventType) query = query.eq("event_type", eventType);

  const since = searchParams.get("since");
  if (since) query = query.gte("created_at", since);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse(error.message, 500);

  return paginatedResponse(data || [], count || 0, page, limit);
}
