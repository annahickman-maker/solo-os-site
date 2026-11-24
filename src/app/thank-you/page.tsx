/**
 * /thank-you - where Stripe sends a buyer after paying.
 *
 * A generic confirmation only. Stripe adds ?session_id=... to the URL; this
 * page never reads or shows it (and clears it from the address bar), shows no
 * order details, and sends no referrer, so a shared or guessed link reveals
 * nothing. The order itself is recorded by the
 * dashboard's Stripe webhook, not by this page. Copy: siteConfig.thankYou.
 */
import type { Metadata } from "next";
import ButtonLink from "@/components/site/ButtonLink";
import Container from "@/components/site/Container";
import ScrubQuery from "@/components/site/ScrubQuery";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: siteConfig.thankYou.title,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ThankYouPage() {
  const t = siteConfig.thankYou;
  return (
    <section className="py-20 sm:py-28">
      <ScrubQuery />
      <Container>
        <div className="mx-auto max-w-2xl rounded-panel border border-line bg-surface p-8 text-center shadow-lift sm:p-12">
          <h1 className="text-[2rem] font-semibold leading-[1.1] text-ink sm:text-[2.5rem]">{t.heading}</h1>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-muted">{t.body}</p>
          <p role="status" className="mt-6 rounded-card border border-line bg-page-soft px-5 py-4 text-[0.95rem] text-ink">
            {t.emailNote}
          </p>
          <div className="mt-8">
            <ButtonLink link={t.backLink} variant="secondary" />
          </div>
        </div>
      </Container>
    </section>
  );
}
