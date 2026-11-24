/**
 * Helpers for the selling buttons in site.config.ts (CtaAction). Relative
 * imports only, so the tests can load it.
 */
import type { CtaAction, SiteConfig } from "../site.config.ts";

/** Every product slug a checkout button on this site sells. The checkout route accepts only these. */
export function checkoutSlugs(config: Pick<SiteConfig, "hero" | "offer">): string[] {
  const actions: CtaAction[] = [config.hero.primaryCta.action, ...config.offer.plans.map((p) => p.cta.action)];
  return [...new Set(actions.flatMap((a) => (a.type === "checkout" ? [a.productSlug] : [])))];
}

/** The id of the email form section the "lead" action scrolls to. */
export const LEAD_SECTION_ID = "get-started";
