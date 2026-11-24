"use client";

import { useState } from "react";
import type { CtaButton as CtaButtonConfig, SiteConfig } from "@/site.config";
import { LEAD_SECTION_ID } from "@/lib/cta";
import SmartLink from "./SmartLink";
import { buttonClass, type ButtonVariant } from "./ButtonLink";

type CheckoutCopy = SiteConfig["checkout"];
type ErrorCode = "invalid" | "not_sold_here" | "rate_limited" | "not_configured" | "unavailable" | "error";

function messageFor(code: ErrorCode | undefined, copy: CheckoutCopy): string {
  switch (code) {
    case "not_configured":
      return copy.notReady;
    case "unavailable":
    case "not_sold_here":
      return copy.unavailable;
    case "rate_limited":
      return copy.tooManyTries;
    default:
      return copy.error;
  }
}

/** Scrolls to the email form and puts the cursor in its email field. */
function goToLeadForm(event: React.MouseEvent<HTMLAnchorElement>) {
  const section = document.getElementById(LEAD_SECTION_ID);
  if (!section) return; // not on the home page: the href takes the visitor there
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  const input = section.querySelector<HTMLInputElement>('input[type="email"]');
  input?.focus({ preventScroll: true });
  history.replaceState(null, "", `#${LEAD_SECTION_ID}`);
}

/**
 * A selling button from site.config.ts: lead, checkout, booking or link
 * (see CtaAction). Checkout posts only the product slug to this site's
 * POST /api/checkout; the price is the dashboard's.
 */
export default function CtaButton({
  cta,
  checkoutCopy,
  variant = "primary",
  className = "",
}: {
  cta: CtaButtonConfig;
  checkoutCopy: CheckoutCopy;
  variant?: ButtonVariant;
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const classes = buttonClass(variant, className);
  const action = cta.action;

  if (action.type === "lead") {
    return (
      <a href={`/#${LEAD_SECTION_ID}`} onClick={goToLeadForm} className={classes}>
        {cta.label}
      </a>
    );
  }
  if (action.type === "booking") {
    return (
      <a href={action.url} target="_blank" rel="noopener noreferrer" className={classes}>
        {cta.label}
      </a>
    );
  }
  if (action.type === "link") {
    return (
      <SmartLink href={action.href} className={classes}>
        {cta.label}
      </SmartLink>
    );
  }

  async function openCheckout() {
    if (action.type !== "checkout" || opening) return;
    setOpening(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug: action.productSlug }),
      });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: ErrorCode };
      if (response.ok && typeof result.url === "string" && result.url.startsWith("https://")) {
        window.location.assign(result.url);
        return; // keep the button busy while the browser leaves
      }
      setError(messageFor(result.error, checkoutCopy));
    } catch {
      setError(checkoutCopy.error);
    }
    setOpening(false);
  }

  return (
    <div className={className.includes("w-full") ? "w-full" : undefined}>
      <button type="button" onClick={openCheckout} disabled={opening} aria-busy={opening} className={`${classes} disabled:opacity-60`}>
        {opening ? checkoutCopy.openingLabel : cta.label}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
