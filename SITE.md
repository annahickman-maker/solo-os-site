# Editing the site

Three things to know: copy lives in one file, the look lives in one file, and
leads, payments and bookings flow to the dashboard.

## 1. Edit copy: `src/site.config.ts`

Every word on the site comes from `siteConfig`:

| Field | Where it shows |
| --- | --- |
| `name`, `description`, `homeTitle` | Header, footer, browser tab, search results, structured data, llms.txt |
| `header.nav`, `header.cta` | Top bar links and button |
| `hero` | 1. Specific result (headline) + timeframe badge, subhead, buttons (the main one takes an `action`), note |
| `proof` | 2. Result numbers |
| `avatar` | 3. Who it is for, and who it is not for |
| `method` | 4. How you get results: your method's steps |
| `about` | 5. Why trust you: story, optional photo, credentials |
| `offer` | 6. What's included, how it is delivered, and the plan card(s) to buy (each button takes an `action`) |
| `faq` | 7. Questions and answers (also published as FAQ structured data) |
| `testimonials` | 8. Customer quotes |
| `finalCta` | 9. Closing heading, urgency line, and the email form's labels and messages |
| `checkout` | Messages a checkout button shows while opening Stripe, or when it cannot |
| `thankYou` | The `/thank-you` page Stripe returns buyers to |
| `footer` | Blurb, links, legal line |

Rules for links: `#offer` jumps to a section on the home page (the
section ids are `proof`, `for-you`, `method`, `about`, `offer`, `faq`,
`testimonials`, `get-started`); use `/#offer` from other pages; full `https://` URLs open in a new tab.

Lists can grow or shrink (stats, avatar lines, method steps, credentials,
offer items, plans, FAQ, testimonials). Leave `hero.timeframe`,
`about.photo` or `finalCta.urgency` as "" to hide them. Run `npx tsc --noEmit -p .`
after editing: it flags any missing or misspelled field.

To reorder or drop a whole section, edit the list in `src/app/page.tsx`.

### Button actions

The hero's main button (`hero.primaryCta`) and every plan's button
(`offer.plans[].cta`) are `{ label, action }`. The `action` says what the
button does (type `CtaAction` in `src/site.config.ts`):

| Action | What happens | Needs |
| --- | --- | --- |
| `{ type: "lead" }` | Scrolls to the email form at the bottom of the page and puts the cursor in it | The lead capture setup in section 4 |
| `{ type: "checkout", productSlug: "main-offer" }` | Opens Stripe checkout for the dashboard product with that slug; the buyer returns to `/thank-you` | Section 5 |
| `{ type: "booking", url: "https://cal.com/you/discovery-call" }` | Opens your Cal.com booking page in a new tab | Section 6 |
| `{ type: "link", href: "https://..." }` | Any other link: `#section`, `/#section`, or a full URL (a community, another store) in a new tab | Nothing |

The placeholder plans show one of each selling kind: Starter collects an email,
Most popular goes to checkout, Premium books a call. The `price` text on a card
is only words: checkout always charges the dashboard product's price, so keep
the two the same.

## 2. Restyle: `src/app/theme.css`

All colours, fonts, radius, shadow and page width are CSS variables in
`:root`:

- Surfaces: `--site-bg`, `--site-bg-soft` (alternating bands), `--site-surface` (cards), `--site-surface-2`
- Text: `--site-ink`, `--site-muted`, `--site-faint`
- Lines: `--site-line`, `--site-line-strong`
- Actions: `--site-primary`, `--site-primary-ink`, `--site-accent`, `--site-danger`
- Type: `--site-font-sans`, `--site-font-heading`, `--site-font-mono`, `--site-heading-tracking`
- Shape: `--site-radius-sm`, `--site-radius`, `--site-radius-lg`, `--site-radius-pill`, `--site-lift`
- Layout: `--site-max-width`

The default is the calm light palette of the Solo OS dashboard. A matching
dark palette sits under `html[data-theme="dark"]`; turn it on by adding
`data-theme="dark"` to `<html>` in `src/app/layout.tsx`.

Fonts are loaded in `src/app/layout.tsx` with `next/font/google` (Geist). To
change the font, swap that import (keep the `variable` names) or point
`--site-font-sans` at a system stack.

Components read the tokens through Tailwind names mapped in
`src/app/globals.css` (`bg-page`, `bg-surface`, `text-ink`, `text-muted`,
`border-line`, `bg-primary`, `text-accent`, `rounded-card`, `rounded-pill`,
`shadow-lift`, `font-heading`, ...). For layout or spacing changes, edit the
classes in `src/components/sales/sections.tsx` and `src/components/site/*`.
Keep pages working below 640px: classes are mobile first, with `sm:`, `md:`
and `lg:` adding the wider layouts.

## 3. No articles here

The site is one sales page. It has no articles or blog pages. Articles are
written in the dashboard and published wherever the owner writes (Substack or
their own blog).

## 4. Leads: from the sales page to the dashboard CRM

1. The email form in the final section posts to `POST /api/leads` with the
   email, optional first name, `form` and `source` (from
   `finalCta.form.formId` and `.source`) and the page path.
2. The route keeps only allowlisted fields and forwards them to the
   dashboard's `POST /api/crm/capture` with `x-capture-key: CRM_CAPTURE_KEY`,
   via the `BACKEND_WORKER` service binding (or `BACKEND_URL` over HTTP
   locally).
3. The dashboard creates or updates the lead, logs the form submission and
   runs any workflows. If it is unreachable, the site writes the lead to
   Supabase directly so the sign-up is not lost (no workflows run then).

To add another form, reuse `src/components/site/LeadForm.tsx` with its own
`LeadFormCopy` (give it a distinct `formId` so the dashboard can tell forms
apart). Full contract and env vars: `README.md`.

## 5. Payments: checkout buttons and the thank-you page

1. In the dashboard, turn on Setup -> Modules -> Sales, open Sales and add the
   product. Its slug is what `productSlug` names. A `Digital product` carries
   a private delivery link that the dashboard emails to the buyer once paid.
2. A checkout button posts only `{ productSlug }` to this site's
   `POST /api/checkout`. That route accepts only slugs a checkout button in
   `site.config.ts` names, refuses oversized or malformed bodies, limits each
   visitor to 10 tries per 10 minutes, and refuses cross-site browser calls.
3. It forwards the slug to the dashboard's `POST /api/crm/checkout` through
   the `BACKEND_WORKER` binding, signed with the secret `CHECKOUT_API_KEY`: a
   dashboard agent key with only `money:checkout` (dashboard AGENT-KEYS.md).
   The dashboard prices the product, records a pending order and returns the
   Stripe page, which the browser opens.
4. Stripe sends the buyer to `/thank-you` (a generic "check your email" page
   that shows no order details) or back to `/#offer` if they cancel. The
   dashboard's Stripe webhook marks the order paid and, for a digital product,
   emails the link.

Until the dashboard has its Stripe keys and webhook secret, and the site has
`CHECKOUT_API_KEY`, a checkout button says "Checkout isn't switched on yet"
(`checkout.notReady`). Nothing else breaks.

## 6. Bookings

A `booking` button is a plain link to your Cal.com page: no Cal.com script
runs on this site. Cal.com collects the guest's name and email and sends the
booking to the dashboard through its signed webhook, which creates the lead,
the appointment and the reminders. Setup steps: dashboard BOOKINGS.md,
"Booking from the sales page".
