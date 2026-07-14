# Architecture

## Stack

- **Framework**: [Astro](https://astro.build) 7, `output: "server"` (SSR by default) with `@astrojs/vercel` as the deployment adapter. Pages that don't depend on per-request data opt into static rendering with `export const prerender = true`.
- **Language**: TypeScript, `astro/tsconfigs/strictest`.
- **Formatting/linting**: [Biome](https://biomejs.dev) — sole tool, no ESLint/Prettier. Config in `biome.json`.
- **Package manager**: pnpm via corepack, pinned in `package.json#packageManager`. Node pinned in `.nvmrc`.
- **Deploy**: Vercel. Production ships only from a release tag (see `scripts/vercel-ignore-build.sh`), not from every push to `main` — the Vercel git integration is deliberately disabled for `main` and `release-please--*` branches.
- **Images**: local assets under `src/assets/**`, optimized at build time by `astro:assets` (Sharp) into static responsive variants — deliberately not the Vercel adapter's `imageService`, to stay portable off-Vercel and off the Image-Optimization quota. Add `sharp` as a devDependency when a fork starts using `astro:assets`.

## Repository layout

```text
src/
  pages/       # file-based routing
  layouts/     # document shells (main.astro: lang, head, chrome)
  components/  # .astro components; layout/ holds the page chrome (header, footer, skip-link)
  lib/         # logic without markup: site.ts (SSoT), motion/ — leaf layers
  styles/      # design tokens (3 tiers) + globals orchestrator
public/        # static assets, served as-is (favicons, og-default.png placeholder)
docs/          # planning + architecture docs for whichever project is built from this template
  guides/      # domain-specific pattern references, consulted by the vertical agents (see below)
  milestone-templates/ # reusable milestone blueprints (see docs/milestone-templates/README.md)
scripts/       # operational tooling — never imported by src/
  gen/         # plop generators (page/component/collection/section) + ts-morph injection
  templates/   # .hbs templates the generators render
plopfile.mjs   # CLI harness: `pnpm gen` / `pnpm gen:<name>`
.claude/
  agents/      # vertical subagent definitions
  commands/    # /milestone (seed issues) + /pr (implement one) commands
```

## Source layering

`src/` is the boundary for everything the app build bundles — runtime code never
lives outside it, tooling never lives inside it. Within `src/`, dependencies
flow one way:

- `lib/` — leaf layers: no imports from the rendering tree (no `.astro`, no
  layouts/pages). `site.ts` is the single source of truth for site metadata and
  chrome content; `motion/` owns the client-side motion lifecycle.
- `components/` consume `lib/`. `components/layout/` is the page chrome, driven
  entirely by `SITE` (nav/CTA/legal/microcopy — no hardcoded content).
- `layouts/` compose components into the document shell; `pages/` talk to
  layouts, never to `head.astro` directly.

## UI primitives — no React/Radix in the base scaffold

`src/components/ui/` holds native `.astro` primitives (button, badge, alert,
card, input, textarea) using `cva` variants + `cn()` — shadcn's API shape with
zero client runtime. This is deliberate: across real projects the friction with
shadcn-on-Astro came specifically from *stateful, portal-based* Radix
components inside islands, not from the presentational layer.

If a fork genuinely needs a stateful component (Dialog, Calendar, Accordion),
bringing in React + Radix **for that specific island** is fine — with these
known failure modes in mind (hit in production, don't rediscover them):

- Use `client:idle`, not `client:visible`, for portal content that is zero-size
  while closed — a closed Dialog never intersects, so `client:visible` never
  hydrates it.
- Astro's CSP needs `unsafe-inline` in `style-src` (or the `styleDirective`
  escape hatch) for Radix's runtime-injected styles.
- Islands don't share state: bridge static markup ↔ island through `data-*`
  attributes explicitly.

## Commit and release workflow

- Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook.
- Squash-merge only into `main` (one PR = one commit on `main`).
- Release automation via release-please (see `HOW_TO_USE.md` for the secrets checklist required to activate it).

## Planning and vertical agents

Work for a project built from this template is seeded as GitHub issues via `/milestone <template-name>|<N>` (from a `docs/milestone-templates/*.md` blueprint or a hand-written `docs/ROADMAP.md` section) and implemented one issue at a time via `/pr <issue-number>`, coordinating domain-specific vertical agents (`.claude/agents/`) — each following the matching guide in `docs/guides/*.md` when one exists. See `CLAUDE.md` for the full breakdown.
