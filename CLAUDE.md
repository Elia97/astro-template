Reusable Astro template (personal/freelance use). Rules under `[HARD]` are non-negotiable — don't work around them for convenience, even if they seem to block a task.

## Stack and conventions

- **Package manager**: pnpm via corepack only — version pinned in `packageManager` (`package.json`). No npm/yarn, no global installs.
- **Node**: version pinned in `.nvmrc` — respect it, don't assume a different version.
- **Formatter/linter**: Biome only (`biome.json`) — no ESLint/Prettier. Style: 2 spaces, single quotes, no semicolons, trailing commas.
- **TypeScript**: `astro/tsconfigs/strictest`. If `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` flag an error, fix it in the code — don't relax the config to make it go away.
- **Rendering**: `output: "static"` — pages are prerendered by default. A page that needs per-request data opts out with `export const prerender = false` explicit in the frontmatter. The server comes from the adapter, not from this setting: actions and on-demand routes work either way.
- **Deploy**: Vercel, via `@astrojs/vercel`.
- **Reading the tree**: `docs/ARCHITECTURE.md` § Repository layout labels every path `machinery` / `config` / `chrome` / `seed` / `example`. Touch machinery to fix a defect, not to tidy; extend the `example` pattern rather than inventing a second one, and don't delete a `seed` path — the generators write into it.
- **Comments**: keep only what the code can't say itself — normative constraints/invariants, non-obvious warnings/gotchas, security/env notes, `TODO`/`FIXME`, `[HARD]` markers, and functional directives (`@vitest-environment`, `@ts-expect-error`, `biome-ignore`, …). Drop prose that restates the code, "what it does" narration, and pointers to `docs/`/guides/legacy. Match the surrounding (deliberately low) comment density, not a verbose baseline.

## Workflow [HARD]

- Commits: Conventional Commits, validated by commitlint on lefthook's `commit-msg` hook (`type(scope): subject`). A commit that doesn't match the format is rejected by the hook — don't bypass it with `--no-verify`.
- Before considering a task done, run `pnpm run ci` (Biome check + type-check, doesn't modify files) — it must pass clean.
- The `pre-commit` hook auto-formats staged files with Biome: it's normal for files to be rewritten at commit time, that's not an error.
- `docs/PROJECT.md` is the client's brief in their own words — never modify it arbitrarily; update it only with explicit new client input.

## Planning and vertical agents

- Work is planned in `docs/ROADMAP.md` (a ledger of milestones and their sub-tasks, cross-referenced to GitHub issues) and `docs/DECISIONS.md` (open decisions, informational — doesn't block seeding a milestone).
- **Seeding**: `/milestone <template-name>|<N>` turns a `docs/milestone-templates/*.md` template (or a hand-written `docs/ROADMAP.md` section) into a native GitHub Milestone plus one GitHub issue per sub-task — plan mode previews every issue before creation, one approval creates the whole batch. It never writes application code, never branches, never commits.
- **Implementation**: `/pr <issue-number>` implements a single GitHub issue end-to-end (branch → vertical agents → quality gates → PR body with `Closes #N`) — one issue = one PR = one squash commit. Never commits/pushes/opens a PR on its own.
- Available vertical agents (`.claude/agents/`), one per domain: `content-agent`, `ui-agent`, `seo-agent`, `forms-agent`, `perf-rendering-agent`, `ops-agent`. Both `/milestone` (suggesting an agent per issue) and `/pr` (implementing one) use the same domain-detection logic. Each agent reads the matching guide in `docs/guides/*.md` when one exists, and falls back to standard best practices when it doesn't. Role (implement/review) is decided at invocation-prompt level, not by separate agent files.
- Reusable milestone blueprints live in `docs/milestone-templates/*.md` — same "stable, reusable across projects" status as `docs/guides/*.md`.

## Development

Dev server: `astro dev --background`, managed with `astro dev stop` / `astro dev status` / `astro dev logs`.

## Documentation

Astro docs: https://docs.astro.build — consult them before touching routing/middleware, components, framework islands, content collections, Tailwind styling or i18n.
