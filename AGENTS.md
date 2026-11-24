# Agent rules

Read `README.md` for setup and `SITE.md` for how copy, theme, articles and
leads work. This file adds the rules for agents working inside the repo.

## Where things live

- Copy and links: `src/site.config.ts` only. Do not hard-code page copy in components.
- Colours, fonts, radius, shadow: `src/app/theme.css` only. Components use the
  Tailwind names mapped in `src/app/globals.css`.
- Sales page section order: `src/app/page.tsx`. Section markup: `src/components/sales/sections.tsx`.
- The database belongs to the dashboard repo. This repo has no migrations; never add one here.

## Cloudflare / OpenNext rules

- Never add `export const runtime = 'edge'` to a route.
- `NEXT_PUBLIC_` values exist only at build time on Workers. Server code reads
  `process.env.NEXT_PUBLIC_X || process.env.X` and the runtime copy lives in `wrangler.jsonc` `vars`.
- Secrets are set with `npx wrangler secret put <NAME> --name <worker>`.
- Run `npm run build` before pushing; `next dev` misses some type errors.

## Worktrees

Agents that change files work in a git worktree at `.worktrees/<task>` inside
this repo (gitignored), one per branch. Remove the worktree and branch once merged.
Do not run `npm install` inside a worktree unless the task must build or test.
