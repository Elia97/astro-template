# Content collections

Conventions established by the homepage-sections pattern.

## Homepage: singleton split into sections

- One `.yml` per section under `src/content/homepage/` (DATA shape: only
  `entry.data`, no renderable body). Schema = `z.discriminatedUnion` on the
  `section` field (`src/lib/schemas/homepage/index.ts`), one schema file per
  section (`hero.ts`, …), shared primitives in `src/lib/schemas/common.ts`.
- Access ONLY through `getHomepageSections(locale?)` in `src/lib/homepage.ts` —
  never `getCollection('homepage')` directly from a page. The SSoT chain is
  Zod schema → `CollectionEntry<'homepage'>['data']` → `HomepageSections` →
  component Props (`type Props = HomepageSections['hero']`), so a schema change
  propagates to component types with zero hand-written duplication.
- Section components live in `src/components/home/`, one per section, and are
  wired in `src/pages/index.astro`.

## Locale layout (matches the native i18n routing decision)

- Default-locale content is FLAT: `src/content/homepage/hero.yml` (entry id
  `hero`). Additional locales go in a subfolder: `src/content/homepage/en/hero.yml`
  (entry id `en/hero`). Adding a locale is purely additive — never move the
  default locale's files.
- `getHomepageSections()` defaults to `i18n.defaultLocale` from
  `astro:config/client`; pass `Astro.currentLocale` from pages.

## Fail-loud contract

- A section declared in `getHomepageSections`'s return object but missing its
  content file throws at build time (`pick()`), so a forgotten file breaks CI
  instead of shipping a broken page. The same throw covers duplicate sections
  within a locale and default-locale files misplaced in a locale folder.
- The build-time guarantee holds because every consumer of
  `getHomepageSections` is prerendered (`export const prerender = true`). A
  future SSR consumer would turn these throws into runtime 500s — keep
  homepage routes prerendered (see `rendering-performance.md`).
- The collection uses a custom `generateId` (raw relative path minus
  extension). Don't remove it: the default one slugifies segments
  (`en-US/` → `en-us/`), honors a top-level `slug` key in the YAML and strips
  `/index` — each of which breaks the locale filter or lets content silently
  land in the wrong locale.
- **Local-cache gotcha (verified)**: with a warm content-layer store, deleting
  a content file may NOT fail a local `pnpm run build` — the stale entry is
  served from `node_modules/.astro/data-store.json`. CI is always cold, so the
  guarantee holds there. If a local build behaves suspiciously after
  adding/removing content files, clear `node_modules/.astro` (and `.astro/`).

## The CMS seam (per-fork decision, researched 2026-07)

`getHomepageSections` is the adapter seam: components consume ONLY its typed
output, so a fork can swap the content backend by reimplementing that one
function (build-time loader, or a live collection for SSR freshness) — the
Zod → Props chain stays intact. Don't bake a CMS into the template.

- Client needs self-service editing of THESE files: **Sveltia CMS** maps 1:1
  onto this exact layout (file collections with per-file schemas;
  `omit_default_locale_from_file_path: true` = our flat-default + locale
  subfolders). A static `/admin` page per fork, MIT, $0, no restructuring.
- Client needs workflows/visual editing: evaluate Sanity or Storyblok per
  fork (both first-party Astro SDKs; Storyblok's visual editor needs SSR,
  which this template already runs).

## Generator injection points

Marked with `INJECTION POINT` comments, asserted (throw, never silent no-op)
by the generators:

- `src/content.config.ts` — `gen:collection` (shipped). The contract:
  `export const collections = { … }` — **exported** (Astro silently ignores a
  non-exported object) and initialized with an object literal. Duplicates and
  identifier collisions (imports/variables) throw descriptive errors in a
  pre-flight check, before any file is written. The INJECTION POINT comment
  lives INSIDE the literal — statements injected above the declaration would
  detach a leading comment.
- `gen:section` (shipped) asserts three hook points in a pre-flight (before
  any file is written), throwing descriptive errors on each:
  1. `src/lib/schemas/homepage/index.ts` — the `z.discriminatedUnion` call
     inside `homepageCollectionSchema`
  2. `src/lib/homepage.ts` — `getHomepageSections`'s return object literal
  3. `src/pages/index.astro` — the `// @gen:home-imports` and
     `{/* @gen:home-sections */}` markers. **Insertion side is part of the
     contract: insert ABOVE the marker.** Verified: inserting below
     `@gen:home-imports` makes Biome's `organizeImports` adopt the marker as
     leading trivia of the new import and relocate it into the sorted block.
  No `image()` option yet — no real image section exists to derive it from;
  add it (schema function gains a `SchemaContext` param) when one does.
