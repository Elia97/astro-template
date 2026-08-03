# astro-template

Reusable [Astro](https://astro.build) template for personal/freelance projects — Node 24, pnpm, Biome, strict TypeScript, and a Vercel deployment already wired up.

## Stack

- **Node** 24 (pinned in `.nvmrc`), **pnpm** via corepack (pinned in `package.json#packageManager`)
- **Biome** — sole formatter/linter (no ESLint/Prettier)
- **TypeScript** — `astro/tsconfigs/strictest`
- **Rendering** — `output: "server"` (SSR by default), static pages opt in via `export const prerender = true`
- **Deploy** — Vercel, via `@astrojs/vercel`; production ships only from a release tag, not from every push (see `scripts/vercel-ignore-build.sh`)
- **Commits** — Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook

## Getting started

```sh
corepack enable
pnpm install
pnpm dev
```

`pnpm install` also installs the git hooks (lefthook) automatically.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the production build locally |
| `pnpm format` | Format the codebase with Biome (writes) |
| `pnpm lint` | Lint with Biome (report only) |
| `pnpm check` | Format + lint + organize imports with Biome (writes) |
| `pnpm typecheck` | Run `astro check` |
| `pnpm ci` | Non-mutating check used in CI: `biome ci` + typecheck |

## Planning and workflow

Issue-driven: `/milestone` seeds a milestone as a GitHub Milestone plus one issue per sub-task; `/pr <issue-number>` implements one issue end-to-end — one issue = one PR = one squash commit. Planning lives in `docs/ROADMAP.md` and `docs/DECISIONS.md`.

See `CLAUDE.md` for the full set of project conventions.
