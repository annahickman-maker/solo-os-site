# Solo OS site

The public sales page for Solo OS. Each owner deploys it on
their own Cloudflare account, next to their Solo OS dashboard. Both use the
same Supabase project; the dashboard repo owns the database schema.

- `/` is a one-page sales page. All copy is in `src/site.config.ts`; all theme
  values are in `src/app/theme.css`. See `SITE.md`.
- `/api/leads` sends email sign-ups to the dashboard CRM.
- `/api/checkout` opens Stripe checkout for a dashboard product; `/thank-you`
  is where buyers land after paying.

Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase,
Cloudflare Workers via OpenNext.

## Run locally

Node 22 or newer.

```bash
cp .env.local.example .env.local   # fill in the values
npm install
npm run dev
```

## Deploy to Cloudflare

1. In `wrangler.jsonc` replace the placeholders:
   - `REPLACE_SUPABASE_URL`, `REPLACE_SUPABASE_ANON_KEY`: your Supabase project URL and anon key.
   - `REPLACE_DASHBOARD_URL`: your dashboard's public URL.
   - `REPLACE_DASHBOARD_WORKER_NAME`: your dashboard Worker's name (for the service binding).
   - Optionally rename the Worker (`name`, default `solo-os-site`).
2. Set the build-time variables `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally `NEXT_PUBLIC_SITE_URL`) in
   the Cloudflare build settings.
3. Set the secrets:
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name solo-os-site
   npx wrangler secret put API_SECRET_KEY --name solo-os-site
   npx wrangler secret put CRM_CAPTURE_KEY --name solo-os-site
   npx wrangler secret put CHECKOUT_API_KEY --name solo-os-site   # only if a button sells at checkout
   ```
4. `npm run deploy` (builds and deploys).
5. On the dashboard, point its `FRONTEND_WORKER` service binding and site URL
   at this Worker.

## Environment variables and bindings

| Name | Kind | Needed | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | build var | yes | Supabase URL baked into the bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build var | yes | Supabase anon key baked into the bundle |
| `SUPABASE_URL` | Worker var | yes | Runtime copy of the Supabase URL |
| `SUPABASE_ANON_KEY` | Worker var | yes | Runtime copy of the anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | yes | Server reads for llms.txt; lead fallback; visitor link |
| `BACKEND_URL` | Worker var | yes | Dashboard URL for lead capture |
| `CRM_CAPTURE_KEY` | secret | yes | Must equal the dashboard's CRM capture key |
| `CHECKOUT_API_KEY` | secret | for checkout buttons | A dashboard agent key with only `money:checkout` (dashboard AGENT-KEYS.md); signs checkout requests |
| `API_SECRET_KEY` | secret | yes | Must equal the dashboard's `API_SECRET_KEY`; guards the write API the dashboard publishes through |
| `BACKEND_WORKER` | service binding | yes on workers.dev | Points at the dashboard Worker; lead capture and checkout go through it |
| `ASSETS` | assets binding | yes | Static files (set by OpenNext) |
| `NEXT_PUBLIC_SITE_URL` | build var | no | Canonical origin; derived from the request when unset |
| `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `RESEND_REPLY_TO` | secret / var | no | Only for `/api/email/send` |
| `RESEND_WEBHOOK_SECRET` | secret | no | Only for `/api/email/webhook`; required in production if that route is used |
| `CONTENT_AGENT_API_KEY`, `SEO_AGENT_API_KEY`, `ANALYTICS_AGENT_API_KEY`, `EMAIL_AGENT_API_KEY`, `OPENCLAWD_API_KEY` | secret | no | Optional per-agent API keys accepted alongside `API_SECRET_KEY` |

## Lead capture

The email form at the bottom of the sales page (`src/components/site/LeadForm.tsx`)
posts to `POST /api/leads` on this site. That route:

1. Drops honeypot submissions (a hidden `website` field) and checks the email.
2. Builds a payload from an allowlist only: name fields, email, phone,
   company, timezone, message, `form`, `source`, `capture_page`. Tags,
   offers, workflow ids and `custom` fields sent by a browser are never forwarded.
3. Calls the dashboard's `POST /api/crm/capture` with header
   `x-capture-key: CRM_CAPTURE_KEY`. On Cloudflare it goes through the
   `BACKEND_WORKER` service binding (needed for workers.dev to workers.dev
   calls); locally it uses plain HTTP to `BACKEND_URL`. A failed bound call is
   not retried over public HTTP.
4. If the dashboard is unreachable, ordinary forms fall back to writing the
   lead and its activities straight to Supabase (`via: "fallback"`, no
   workflows run). Send `critical: true` to fail closed with `503` instead.
5. Links the anonymous visitor cookie (`so_vid`) to the lead in `visitors`.

Response: `{ ok, lead_id, created, via }` with `201` for a new lead, `200`
for an update. Server-only code (for example a payment webhook) should call
`captureLeadServerSide(payload, { allowFallback: false })` from
`src/lib/crm/capture.ts` and return a non-2xx response when it fails so the
provider retries. Lifecycle tag helpers are in `src/lib/crm/capture-state.ts`.

## Checkout

A plan or hero button with `action: { type: "checkout", productSlug }`
(`src/components/site/CtaButton.tsx`) posts `{ productSlug }` to
`POST /api/checkout` on this site. That route
(`src/app/api/checkout/route.ts`, logic in `src/lib/crm/checkout-backend.ts`):

1. Refuses cross-site browser calls (an `Origin` that is not this site), bodies
   over 2 KB, and more than 10 tries per visitor IP per 10 minutes (per Worker
   isolate, so best effort; add a Cloudflare rate limiting rule on
   `/api/checkout` for a hard limit).
2. Accepts only a slug that a checkout button in `site.config.ts` names, and
   an optional email. Anything else in the body, a price included, is ignored.
3. Calls the dashboard's `POST /api/crm/checkout` with `{ product_slug, email?,
   success_url, cancel_url }`, signed with `CHECKOUT_API_KEY`
   (`x-api-key`, `x-timestamp`, `x-signature` = hex HMAC-SHA256 of
   `POST:/api/crm/checkout:<timestamp>:<body>`). Return URLs are built from
   `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`), else the request's own origin:
   `/thank-you?session_id={CHECKOUT_SESSION_ID}` and `/#offer`. It goes
   through the `BACKEND_WORKER` binding, never retried over public HTTP.
4. Answers `{ url }` (the Stripe page) or `{ error }` with one of `invalid`,
   `not_sold_here`, `rate_limited`, `not_configured` (503: Stripe or the key is
   not set up), `unavailable` (the product cannot be sold), `error`. The button
   shows the matching message from `siteConfig.checkout`; details go to the
   Worker log only.

`/thank-you` never reads the session id or shows order details. The order is
recorded by the dashboard's Stripe webhook (dashboard MONEY.md).

## API routes

Public reads: `GET /api/content`, `GET /api/content/[slug]`, `GET /api/offers`
(published or active rows only, unless called with `x-api-key` or a
signed-in session). Public writes: `POST /api/leads`, `POST /api/checkout`,
`POST /api/analytics`, `POST /api/visitors`.

Everything else needs `x-api-key` (or a signed-in session): content writes,
agent logs, the content calendar, entities, offer writes, lead, visitor and
analytics queries, and `/api/email/send`. `/api/email/webhook` verifies the
Resend signature. The dashboard uses `GET|POST /api/content` and
`POST /api/agent-logs`.

## Tests

```bash
npm run test:crm         # unit tests for lead capture and checkout (Node 22.6+)
npm run test:crm:smoke   # boots next dev against fake services and posts a lead
```

The smoke test starts `next dev`, which loads the `BACKEND_WORKER` binding
from `wrangler.jsonc`. With no local dashboard Worker running, that binding
answers 503; run the smoke with the `services` line removed, or with the
dashboard running under `wrangler dev`.

## License

MIT, see `LICENSE`.
