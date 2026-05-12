# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

Minimal Astro starter (Astro v6) with a full development stack. Package manager
is **pnpm**; Node >= 22.12.0 is required.

## Commands

- `pnpm dev` — start dev server at `localhost:4321`
- `pnpm build` — build to `./dist/`
- `pnpm preview` — preview the production build
- `pnpm typecheck` — `astro check` (TS + `.astro` diagnostics)
- `pnpm lint` / `pnpm lint:fix` — ESLint v10 flat config
- `pnpm format` / `pnpm format:check` — Prettier
- `pnpm test` / `test:watch` / `test:coverage` — Vitest (unit)
- `pnpm test:e2e` / `test:e2e:ui` — Playwright (chromium + firefox)
- `pnpm knip` — find unused files/exports/dependencies
- `pnpm check` — runs `typecheck` + `lint` + `format:check` + `test`

## Quality gates

- TypeScript extends `astro/tsconfigs/strictest` plus extra flags
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noPropertyAccessFromIndexSignature`,
  `noFallthroughCasesInSwitch`, `noImplicitReturns`, `isolatedModules`).
- ESLint flat config (`defineConfig` from `eslint/config`): `typescript-eslint`
  `strictTypeChecked` + `stylisticTypeChecked` (scoped to `**/*.ts`) with
  type-aware linting via `projectService`; `eslint-plugin-astro` with explicit
  `tseslint.parser` for `.astro` frontmatter; `eslint-config-prettier` disables
  stylistic conflicts.
- Prettier without semicolons, single quotes, `experimentalTernaries`,
  `objectWrap: preserve`; `prettier-plugin-astro` +
  `prettier-plugin-tailwindcss` (class sorting reads tokens from
  `src/styles/global.css`).
- Husky hooks: `pre-commit` runs `lint-staged` (ESLint + Prettier on staged
  files); `commit-msg` runs commitlint with `@commitlint/config-conventional` —
  commits must follow Conventional Commits.

## CI / automation

- `.github/workflows/ci.yml` — runs typecheck, lint, format check, unit tests,
  build, knip, then Playwright E2E in a separate job.
- `.github/workflows/release-please.yml` — automatic versioning + changelog from
  Conventional Commits.
- `.github/dependabot.yml` — grouped weekly npm updates + monthly GH Actions.

## Architecture

- `src/pages/` — file-based routing; `.astro` / `.md` files become routes.
- `src/layouts/BaseLayout.astro` — SEO meta (via `astro-seo`), canonical, OG,
  RSS link, imports `src/styles/global.css`.
- `src/styles/global.css` — Tailwind v4 entry (`@import 'tailwindcss'`) +
  `@theme` block for design tokens (CSS-first config; no `tailwind.config.js`).
- `src/pages/rss.xml.ts` — RSS feed endpoint via `@astrojs/rss`.
- `public/` — static assets served as-is.
- `astro.config.mjs` — `site` URL, `@astrojs/sitemap` integration,
  `@tailwindcss/vite` plugin.
- `test/` — Vitest unit tests; `e2e/` — Playwright specs.
