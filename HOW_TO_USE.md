# How to use this template

This repo is a personal/freelance starting point — clone it fresh for each new project rather than working directly in `astro-template` itself.

## Bootstrap a new project

1. Clone/duplicate this repo under the new project's name.
2. Rename `package.json#name` — it leaks into the changelog that release-please generates, so it should match the new project, not stay `astro-template`.
3. De-brand the scaffold:
   - `src/lib/site.ts` — name, url, description, nav/CTA/legal, UI microcopy
     (single source of truth: the chrome renders from here, nothing is
     hardcoded in components);
   - `src/styles/tokens.css` — the ONLY file to touch for the visual rebrand
     (raw oklch primitives; the semantic names in `light.css`/`dark.css` stay);
   - `public/og-default.png` — replace the placeholder (1200×630);
   - `astro.config.mjs` → `i18n.defaultLocale`/`locales` if the project isn't
     Italian-first (also update `SITE.localeTags` and `SITE.strings`);
   - `src/content/homepage/hero.yml` — real homepage copy.
4. `corepack enable && pnpm install && pnpm dev` — installs dependencies and git hooks (lefthook), starts the dev server.
5. Create the GitHub repo, then run `bash scripts/bootstrap-github.sh` from inside it (needs `gh` authenticated) — sets up dependabot labels, squash-only merge policy, and Actions permissions for release-please.
6. Connect the repo to a Vercel project, then set **Settings → Build & Deployment → Ignored Build Step** to `bash scripts/vercel-ignore-build.sh` — production only ships from a release tag, not from every push.
7. Fill in `docs/ROADMAP.md` with the new project's real milestones (one milestone = one PR = one release) and `docs/PROJECT.md`/`docs/DECISIONS.md` if the project needs them — these stay empty scaffolds in the template itself.

## What the scaffold gives you

- **Design tokens, three tiers** (`src/styles/`): `tokens.css` (rebrand
  surface) → `light.css`/`dark.css` (stable semantic names) → `globals.css`
  (orchestrator; also extends Tailwind's `container` with centering + gutter).
- **UI primitives** (`src/components/ui/`): native `.astro`, cva + `cn()`,
  shadcn API shape, zero client JS. Compound families (card, alert) are
  folders with a `.ts` barrel; layout lives in `Container`/`Section` only.
- **Base layout + SEO** (`src/layouts/main.astro`): centralized head
  (canonical/hreflang/OG/JSON-LD — pages talk to the layout, never to
  `head.astro`), FOUC-free dark mode, skip-link, view transitions.
- **Homepage sections** (`src/content/homepage/*.yml`): one YAML per section,
  discriminated-union schema, typed access ONLY via
  `getHomepageSections(locale)` — missing/duplicate/misplaced files fail the
  build, and the function is the seam for a per-fork CMS later.
- **i18n, additive by design**: the default locale keeps unprefixed URLs and
  FLAT content files forever; a second language is a config entry plus new
  files under `src/content/homepage/<locale>/` — never a restructure.

Depth and rationale live in `docs/guides/*.md` and `docs/ARCHITECTURE.md`.

## CLI generators

`pnpm gen` (interactive menu) or directly:

- `pnpm gen:section` — homepage section: Zod schema + flat YAML + component,
  injected into the union, the data layer and `index.astro`'s `@gen` markers.
- `pnpm gen:page` — static page, or dynamic `[slug]` with `getStaticPaths`;
  nested paths supported (`legal/privacy`).
- `pnpm gen:component` — native `.astro` component following the cva + `cn()`
  recipe.
- `pnpm gen:collection` — content collection: schema + example content,
  registered into `content.config.ts`.

Contracts worth knowing (details in `docs/guides/content-collections.md`):

- Generators **fail loud**: inputs are validated on the transformed values,
  every injection hook point is asserted in a pre-flight **before any file is
  written**, and the post-gen gate (`astro sync` + `pnpm run check`) fails the
  run on any error.
- If the post-gen gate fails, generated files stay on disk for inspection —
  the error message says how to roll back (`gen:section` also modifies three
  existing files; `git checkout` them).
- Don't rename the injection anchors (`export const collections`,
  `homepageCollectionSchema`, `getHomepageSections`, the `@gen:home-*`
  markers): the generators assert on them and abort with the contract error.

## Adding a locale

The template ships single-locale (`it`) with the i18n rails already in place — a second locale is purely additive:

1. `astro.config.mjs` — add the locale code to `i18n.locales`.
2. `src/lib/site.ts` — add its BCP 47 tag to `localeTags`.
3. `src/i18n/strings/<locale>.ts` — export a `Record<UIKey, string>`; the compiler forces every key to exist.
4. `src/i18n/ui.ts` — register the new dictionary in `dictionaries`.
5. `src/i18n/route-segments.ts` — map the top-level URL segments that change (`contatti` → `contact`); unmapped segments pass through.
6. Content: add `src/content/<collection>/<locale>/…` files (default-locale content stays flat — the loaders enforce this).
7. Pages: mirror the default tree under `src/pages/<locale>/…`; `getHomepageSections(Astro.currentLocale)` and `useTranslations(Astro.currentLocale)` already resolve per locale.

Chrome links go through `localizedHref(Astro.currentLocale, path)` (see header/footer), so nav and legal URLs localize without touching components.

## Release secrets

Release automation (`release-please.yml`) needs these secrets set manually on GitHub — `gh secret set <NAME>` from inside the repo, or Settings → Secrets and variables → Actions:

- `RELEASE_PLEASE_TOKEN` — fine-grained PAT with `contents:write` + `pull_requests:write`. Required because CI doesn't run on PRs opened with the default `GITHUB_TOKEN` (a GitHub Actions anti-recursion safeguard) — without this, release-please's own release PR would never get a `ci` check.
- `VERCEL_TOKEN` — Vercel access token (vercel.com/account/tokens).
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — from `.vercel/project.json` after running `vercel link` locally once.

Until all three Vercel secrets are set, the `deploy` job in `release-please.yml` skips cleanly (no failure) instead of running.

## Day-to-day workflow

- Start new pieces with the generators (`pnpm gen:*`) — they emit code already
  on the project's conventions (layout primitives, schema patterns, fail-loud
  wiring) and formatted by the same Biome gate as CI.
- Implement a milestone with `/milestone <N>[.<x>]` — plan mode, then parallel vertical agents (`.claude/agents/`: content, UI, SEO, forms, rendering/performance, ops), never commits/pushes/opens a PR on its own.
- Vertical agents follow the matching guide in `docs/guides/*.md` when one exists; guides grow from real work rather than being written upfront (see `docs/guides/README.md`).
- Commits are Conventional Commits, validated on commit by lefthook + commitlint. PRs merge in squash only.

See `CLAUDE.md` for the full set of `[HARD]` project conventions, and `docs/ARCHITECTURE.md` for the stack overview.
