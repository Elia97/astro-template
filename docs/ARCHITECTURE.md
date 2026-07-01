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
public/        # static assets, served as-is
docs/          # planning + architecture docs for whichever project is built from this template
  guides/      # domain-specific pattern references, consulted by the vertical agents (see below)
scripts/       # one-off setup scripts (GitHub bootstrap, Vercel ignored-build-step)
.claude/
  agents/      # vertical subagent definitions
  commands/    # /milestone orchestration command
```

## Commit and release workflow

- Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook.
- Squash-merge only into `main` (one PR = one commit on `main`).
- Release automation via release-please (see `HOW_TO_USE.md` for the secrets checklist required to activate it).

## Planning and vertical agents

Work for a project built from this template is planned in `docs/ROADMAP.md` (one milestone = one PR = one release) and `docs/DECISIONS.md` (open decisions, informational, non-blocking). The `/milestone` command implements a milestone by coordinating domain-specific vertical agents (`.claude/agents/`) in parallel, each following the matching guide in `docs/guides/*.md` when one exists — see `CLAUDE.md` for the full breakdown.
