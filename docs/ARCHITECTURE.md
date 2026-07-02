# Architecture

## Stack

- **Framework**: [Astro](https://astro.build) 7, `output: "server"` (SSR by default) with `@astrojs/vercel` as the deployment adapter. Pages that don't depend on per-request data opt into static rendering with `export const prerender = true`.
- **Language**: TypeScript, `astro/tsconfigs/strictest`.
- **Formatting/linting**: [Biome](https://biomejs.dev) — sole tool, no ESLint/Prettier. Config in `biome.json`.
- **Package manager**: pnpm via corepack, pinned in `package.json#packageManager`. Node pinned in `.nvmrc`.
- **Deploy**: Vercel. Production ships only from a release tag (see `scripts/vercel-ignore-build.sh`), not from every push to `main` — the Vercel git integration is deliberately disabled for `main` and `release-please--*` branches.

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
scripts/       # operational tooling (GitHub bootstrap, Vercel ignored-build-step) — never imported by src/
.claude/
  agents/      # vertical subagent definitions
  commands/    # /milestone orchestration command
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

## Commit and release workflow

- Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook.
- Squash-merge only into `main` (one PR = one commit on `main`).
- Release automation via release-please (see `HOW_TO_USE.md` for the secrets checklist required to activate it).

## Planning and vertical agents

Work for a project built from this template is planned in `docs/ROADMAP.md` (one milestone = one PR = one release) and `docs/DECISIONS.md` (open decisions, informational, non-blocking). The `/milestone` command implements a milestone by coordinating domain-specific vertical agents (`.claude/agents/`) in parallel, each following the matching guide in `docs/guides/*.md` when one exists — see `CLAUDE.md` for the full breakdown.
