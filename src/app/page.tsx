/**
 * Home page: the sales page. Copy comes from src/site.config.ts, styling
 * from src/app/theme.css. Reorder or remove sections here.
 *
 * Order: 1 result + timeframe, 2 proof, 3 avatar, 4 method, 5 about,
 * 6 what's included + purchase, 7 FAQs, 8 testimonials, 9 final CTA + urgency.
 */

import { JsonLd } from "@/components/seo/JsonLd";
import {
  About,
  Avatar,
  Faq,
  FinalCta,
  Hero,
  Method,
  Offer,
  Proof,
  Testimonials,
} from "@/components/sales/sections";
import { siteConfig } from "@/site.config";

export default function HomePage() {
  const c = siteConfig;
  return (
    <>
      <Hero hero={c.hero} checkout={c.checkout} />
      <Proof proof={c.proof} />
      <Avatar avatar={c.avatar} />
      <Method method={c.method} />
      <About about={c.about} />
      <Offer offer={c.offer} checkout={c.checkout} />
      <Faq faq={c.faq} />
      <Testimonials testimonials={c.testimonials} />
      <FinalCta finalCta={c.finalCta} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: c.faq.items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />
    </>
  );
}
