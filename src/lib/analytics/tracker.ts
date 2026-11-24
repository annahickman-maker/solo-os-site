/**
 * Analytics Event Tracking
 * Client-side event tracker that sends events to /api/analytics.
 * Page views fire automatically from src/components/site/PageTracker.tsx
 * (mounted in the root layout); buttons and the email form add clicks,
 * checkout starts and captures. The route stores them for the dashboard's
 * Website and Funnels reports (see src/lib/crm/site-events.ts).
 *
 * Each browser tab gets a random session id (sessionStorage), so the
 * dashboard can count funnel steps per session. Page URLs are sent without
 * their query string, so Stripe's ?session_id= is never recorded.
 */

const SESSION_KEY = "so_sid";

/** This tab's random session id; null when storage is blocked. */
export function trackingSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${crypto.randomUUID().replace(/-/g, "")}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export interface TrackEventParams {
  eventType: string;
  eventData?: Record<string, unknown>;
  pageUrl?: string;
  pageSlug?: string;
  contentId?: string;
  offerId?: string;
}

/**
 * Track an analytics event (client-side).
 * Sends to /api/analytics endpoint.
 * Fire-and-forget - doesn't block the UI.
 */
export function trackEvent(params: TrackEventParams): void {
  // Don't track in dev unless explicitly enabled
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_TRACK_DEV
  ) {
    console.debug("[analytics] dev skip:", params.eventType, params);
    return;
  }

  const payload = {
    event_type: params.eventType,
    event_data: {
      ...params.eventData,
      ...(typeof window !== 'undefined' ? {
        traffic_source: new URLSearchParams(window.location.search).get('utm_source')?.slice(0,120) || (()=>{try{return document.referrer?new URL(document.referrer).hostname:'direct';}catch{return 'unknown';}})(),
        device_type: /iPad|Tablet/i.test(navigator.userAgent)?'tablet':/Mobile|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop',
      } : {}),
    },
    page_url: params.pageUrl || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : null),
    page_slug: params.pageSlug || (typeof window !== "undefined" ? window.location.pathname : null),
    content_id: params.contentId || null,
    offer_id: params.offerId || null,
    session_id: trackingSessionId(),
  };

  // Fire and forget
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true, // survives page navigation
  }).catch(() => {
    // Silently fail - analytics should never break the UX
  });
}

/**
 * Common event helpers for consistency.
 */
export const events = {
  pageView: (slug: string) =>
    trackEvent({ eventType: "page_view", pageSlug: slug }),

  contentView: (contentId: string, slug: string) =>
    trackEvent({ eventType: "content_view", contentId, pageSlug: slug }),

  offerView: (offerId: string, slug: string) =>
    trackEvent({ eventType: "offer_view", offerId, pageSlug: slug }),

  offerClick: (offerId: string, slug: string) =>
    trackEvent({ eventType: "offer_click", offerId, pageSlug: slug }),

  checkoutStart: (productSlug: string) =>
    trackEvent({ eventType: "checkout_start", eventData: { product: productSlug } }),

  ctaClick: (ctaId: string, variant?: string) =>
    trackEvent({
      eventType: "cta_click",
      eventData: { cta_id: ctaId, variant },
    }),

  emailCapture: (source: string) =>
    trackEvent({ eventType: "email_capture", eventData: { source } }),

  chatStarted: (page: string) =>
    trackEvent({ eventType: "chat_started", eventData: { page } }),

  scrollDepth: (depth: number, slug: string) =>
    trackEvent({
      eventType: "scroll_depth",
      eventData: { depth },
      pageSlug: slug,
    }),

  timeOnPage: (seconds: number, slug: string) =>
    trackEvent({
      eventType: "time_on_page",
      eventData: { seconds },
      pageSlug: slug,
    }),
};
