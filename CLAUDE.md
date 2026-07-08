Reusable Astro template (personal/freelance use). Rules under `[HARD]` are non-negotiable — don't work around them for convenience, even if they seem to block a task.

## Stack and conventions

- **Package manager**: pnpm via corepack only — version pinned in `packageManager` (`package.json`). No npm/yarn, no global installs.
- **Node**: version pinned in `.nvmrc` — respect it, don't assume a different version.
- **Formatter/linter**: Biome only (`biome.json`) — no ESLint/Prettier. Style: 2 spaces, single quotes, no semicolons, trailing commas.
- **TypeScript**: `astro/tsconfigs/strictest`. If `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` flag an error, fix it in the code — don't relax the config to make it go away.
- **Rendering**: `output: "server"` — pages are SSR by default. Pages that must stay static have `export const prerender = true` explicit in the frontmatter.
- **Deploy**: Vercel, via `@astrojs/vercel`.

## Workflow [HARD]

- Commits: Conventional Commits, validated by commitlint on lefthook's `commit-msg` hook (`type(scope): subject`). A commit that doesn't match the format is rejected by the hook — don't bypass it with `--no-verify`.
- Before considering a task done, run `pnpm run ci` (Biome check + type-check, doesn't modify files) — it must pass clean.
- The `pre-commit` hook auto-formats staged files with Biome: it's normal for files to be rewritten at commit time, that's not an error.
- `docs/PROJECT.md` is the client's brief in their own words — never modify it arbitrarily; update it only with explicit new client input.

## Planning and vertical agents

- Work is planned in `docs/ROADMAP.md` (a ledger of milestones and their sub-tasks, cross-referenced to GitHub issues) and `docs/DECISIONS.md` (open decisions, informational — doesn't block seeding a milestone).
- **Seeding**: `/milestone <template-name>|<N>` turns a `docs/milestone-templates/*.md` template (or a hand-written `docs/ROADMAP.md` section) into a native GitHub Milestone plus one GitHub issue per sub-task — plan mode previews every issue before creation, one approval creates the whole batch. It never writes application code, never branches, never commits.
- **Implementation**: `/pr <issue-number>` implements a single GitHub issue end-to-end (branch → vertical agents → quality gates → PR body with `Closes #N`) — one issue = one PR = one squash commit. Never commits/pushes/opens a PR on its own.
- Available vertical agents (`.claude/agents/`), one per domain: `content-agent`, `ui-agent`, `seo-agent`, `forms-agent`, `perf-rendering-agent`, `ops-agent`. Both `/milestone` (suggesting an agent per issue) and `/pr` (implementing one) use the same domain-detection logic. Each agent reads the matching guide in `docs/guides/*.md` if it exists (authoritative source for this project's conventions); if the guide doesn't exist yet, it applies standard best practices and flags that they're worth codifying into the guide. Role (implement/review) is decided at invocation-prompt level, not by separate agent files.
- Reusable milestone blueprints live in `docs/milestone-templates/*.md` — same "stable, reusable across projects" status as `docs/guides/*.md`.

## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

## Documentation

Full Astro documentation: https://docs.astro.build

Consult it before working on:

- [Routing, dynamic pages, middleware](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [React/Vue/Svelte/other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content and content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
- [Internationalization](https://docs.astro.build/en/guides/internationalization/)
