/**
 * Sales page sections. Each takes its slice of site.config.ts, so copy edits
 * never touch this file. src/app/page.tsx sets their order: reorder or drop
 * a section there.
 */

import type { SiteConfig } from "@/site.config";
import ButtonLink from "@/components/site/ButtonLink";
import CtaButton from "@/components/site/CtaButton";
import Container from "@/components/site/Container";
import LeadForm from "@/components/site/LeadForm";
import { LEAD_SECTION_ID } from "@/lib/cta";

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-faint">
      {children}
    </p>
  );
}

function SectionHead({
  eyebrow,
  heading,
  intro,
  center = false,
}: {
  eyebrow: string;
  heading: string;
  intro?: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] text-ink sm:text-[2.25rem]">
        {heading}
      </h2>
      {intro && <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

function Section({
  id,
  soft = false,
  children,
}: {
  id: string;
  soft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${soft ? "bg-page-soft" : ""}`}>
      <Container>{children}</Container>
    </section>
  );
}

const card = "rounded-card border border-line bg-surface p-6 shadow-lift";

export function Hero({ hero, checkout }: { hero: SiteConfig["hero"]; checkout: SiteConfig["checkout"] }) {
  return (
    <section className="pt-16 pb-16 sm:pt-28 sm:pb-24">
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.05] text-ink sm:text-[3.5rem] lg:text-[4rem]">
            {hero.headline}
          </h1>
          {hero.timeframe && (
            <p className="mt-5 inline-flex rounded-pill border border-line-strong px-4 py-1.5 text-sm font-semibold text-ink">
              {hero.timeframe}
            </p>
          )}
          <p className="mt-6 max-w-2xl text-[1.1rem] leading-relaxed text-muted sm:text-[1.25rem]">
            {hero.subhead}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton cta={hero.primaryCta} checkoutCopy={checkout} />
            {hero.secondaryCta && <ButtonLink link={hero.secondaryCta} variant="secondary" />}
          </div>
          {hero.note && <p className="mt-4 text-sm text-faint">{hero.note}</p>}
        </div>
      </Container>
    </section>
  );
}

export function Proof({ proof }: { proof: SiteConfig["proof"] }) {
  return (
    <Section id="proof" soft>
      <SectionHead eyebrow={proof.eyebrow} heading={proof.heading} />
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {proof.stats.map((stat, index) => (
          <li key={`${stat.label}-${index}`} className={card}>
            <p className="font-heading text-[2.25rem] font-semibold leading-none text-ink">{stat.value}</p>
            <p className="mt-3 text-[0.95rem] text-muted">{stat.label}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Avatar({ avatar }: { avatar: SiteConfig["avatar"] }) {
  return (
    <Section id="for-you">
      <SectionHead eyebrow={avatar.eyebrow} heading={avatar.heading} intro={avatar.intro} />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className="text-[1.05rem] font-semibold text-ink">This is for you if</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {avatar.forYou.map((line, index) => (
              <li key={`${line}-${index}`} className="flex gap-3 text-[0.95rem] text-muted">
                <span aria-hidden="true" className="text-accent">&#10003;</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        {avatar.notForYou.length > 0 && (
          <div className={card}>
            <h3 className="text-[1.05rem] font-semibold text-ink">It is not for you if</h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {avatar.notForYou.map((line, index) => (
                <li key={`${line}-${index}`} className="flex gap-3 text-[0.95rem] text-muted">
                  <span aria-hidden="true" className="text-faint">&#10005;</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

export function Method({ method }: { method: SiteConfig["method"] }) {
  return (
    <Section id="method" soft>
      <SectionHead eyebrow={method.eyebrow} heading={method.heading} intro={method.intro} />
      <ol className={`mt-10 grid gap-4 ${method.steps.length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {method.steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className={card}>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-line-strong text-sm font-semibold text-ink">
              {index + 1}
            </span>
            <h3 className="mt-4 text-[1.05rem] font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function About({ about }: { about: SiteConfig["about"] }) {
  return (
    <Section id="about">
      <div className={`grid gap-10 ${about.photo ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center" : ""}`}>
        {about.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={about.photo}
            alt={about.photoAlt}
            className="aspect-[4/5] w-full rounded-panel border border-line object-cover"
          />
        )}
        <div className="max-w-2xl">
          <Eyebrow>{about.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] text-ink sm:text-[2.25rem]">
            {about.heading}
          </h2>
          {about.paragraphs.map((para, index) => (
            <p key={index} className="mt-4 text-[1.05rem] leading-relaxed text-muted">
              {para}
            </p>
          ))}
          {about.credentials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {about.credentials.map((cred, index) => (
                <li
                  key={`${cred}-${index}`}
                  className="rounded-pill border border-line px-3 py-1 text-sm text-ink"
                >
                  {cred}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

export function Offer({ offer, checkout }: { offer: SiteConfig["offer"]; checkout: SiteConfig["checkout"] }) {
  const plans = offer.plans;
  return (
    <Section id="offer" soft>
      <SectionHead eyebrow={offer.eyebrow} heading={offer.heading} intro={offer.intro} />
      <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {offer.items.map((item, index) => (
          <li key={`${item.title}-${index}`} className="flex gap-4">
            <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-pill bg-accent" />
            <div>
              <h3 className="text-[1.05rem] font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {offer.delivery && (
        <p className="mt-10 max-w-2xl rounded-card border border-line bg-surface px-5 py-4 text-[0.95rem] text-ink">
          {offer.delivery}
        </p>
      )}
      <ul
        className={`mt-8 grid gap-4 ${plans.length > 1 ? "md:grid-cols-2" : ""} ${
          plans.length > 2 ? "lg:grid-cols-3" : ""
        }`}
      >
        {plans.map((plan) => (
          <li
            key={plan.name}
            className={`flex flex-col rounded-panel border bg-surface p-6 shadow-lift sm:p-8 ${
              plan.highlighted ? "border-ink" : "border-line"
            }`}
          >
            <h3 className="text-[1.05rem] font-semibold text-ink">{plan.name}</h3>
            <p className="mt-2 text-sm text-muted">{plan.description}</p>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-heading text-[2.5rem] font-semibold leading-none text-ink">
                {plan.price}
              </span>
              {plan.period && <span className="text-sm text-faint">{plan.period}</span>}
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {plan.features.map((feature, index) => (
                <li key={`${feature}-${index}`} className="flex gap-3 text-[0.95rem] text-muted">
                  <span aria-hidden="true" className="text-accent">
                    &#10003;
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <CtaButton
                cta={plan.cta}
                checkoutCopy={checkout}
                variant={plan.highlighted ? "primary" : "secondary"}
                className="w-full"
              />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Faq({ faq }: { faq: SiteConfig["faq"] }) {
  return (
    <Section id="faq">
      <SectionHead eyebrow={faq.eyebrow} heading={faq.heading} />
      <div className="mt-10 max-w-3xl divide-y divide-line border-y border-line">
        {faq.items.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.05rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="text-xl leading-none text-faint transition-transform duration-150 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function Testimonials({ testimonials }: { testimonials: SiteConfig["testimonials"] }) {
  return (
    <Section id="testimonials" soft>
      <SectionHead eyebrow={testimonials.eyebrow} heading={testimonials.heading} />
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {testimonials.items.map((t, index) => (
          <li key={`${t.name}-${index}`} className={`${card} flex flex-col justify-between gap-6`}>
            <blockquote className="text-[1rem] leading-relaxed text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
            <p className="text-sm">
              <span className="font-semibold text-ink">{t.name}</span>
              <span className="block text-faint">{t.role}</span>
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FinalCta({ finalCta }: { finalCta: SiteConfig["finalCta"] }) {
  return (
    <Section id={LEAD_SECTION_ID}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-[1.75rem] font-semibold leading-[1.15] text-ink sm:text-[2.5rem]">
          {finalCta.heading}
        </h2>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{finalCta.subhead}</p>
        {finalCta.urgency && (
          <p className="mx-auto mt-5 inline-flex rounded-pill bg-ink px-4 py-1.5 text-sm font-semibold text-page">
            {finalCta.urgency}
          </p>
        )}
        <div className="mt-8 text-left">
          <LeadForm copy={finalCta.form} />
        </div>
      </div>
    </Section>
  );
}
