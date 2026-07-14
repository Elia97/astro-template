# Content collections

Three archetypes (*Choosing the archetype*, next). The homepage-sections
pattern is the worked reference for the first; the other two are documented
here to wire the same way on demand.

## Choosing the archetype

Three shapes — pick by the content's structure, not its topic.

- **Singleton split into sections** — one page built from heterogeneous
  blocks. Schema is a `z.discriminatedUnion` on a `section` field, one file
  per section, fronted by a dedicated data-access function
  (`getXSections(locale?)`) that assembles the page. The homepage pattern
  below is the reference — replicate it verbatim.
- **Flat shared-schema** — many entries sharing ONE schema shape, each a full
  page/record. Read them directly (`getCollection` for the listing, `getEntry`
  for one), keyed on the file's `generateId` (the slug); no data-access layer.
- **Document** (`document: true`) — the only form with a renderable `body`
  (MDX/MD). Frontmatter is a flat schema like the shared-schema form; the body
  renders via `render(entry)` → `<Content />`.

Decision rule: reach for a **dedicated collection only when you have many
interchangeable entries**. A fixed, one-off block on a singleton page is a
**section**, not a collection — don't spin one up for it.

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

## Flat shared-schema collections

Every entry validates against one schema; each file is a full page/record
keyed by its `generateId` (slug). Pages read entries directly — no data-access
layer, because there's nothing to assemble (the schema already is the shape).

- Make sub-sections beyond the first and last block **optional**, so a lighter
  entry (e.g. an index page reusing only the opening block and the closing
  call-to-action) validates against the same schema without carrying empty
  middle blocks.
- Add a thin data-access layer **only** when a visibility filter enters the
  picture, and route both listing and detail through it (see *Testable domain
  rules*).

## Document collections (MDX / MD)

The only archetype with a renderable `body`. Scaffold with `gen:collection` in
document mode, then hand-fix — the generator hardcodes a `**/*.md` glob and a
matching `generateId` regex.

- **MDX takes extra edits.** After generation, change the glob and the
  `generateId` regex to `**/*.mdx` / `\.(mdx)$` in `content.config.ts`, and
  register the `@astrojs/mdx` integration in `astro.config.mjs`. Missing the
  integration fails the build with an **unrecognized-extension** error — not a
  schema error, so don't go debugging the schema.
- **Rendering the body.** On a prerendered detail route (`prerender = true` +
  a `getStaticPaths` that enumerates the entries), `const { Content } = await
  render(entry)` (`render` from `astro:content`, the Content Layer API) yields
  a `<Content />` for the body.
- **`{…}` is JS in MDX.** Any authoring marker (layout hint on a heading,
  image sizing, …) goes in **plain text** — never `{.class}`, which is parsed
  as a JS expression and breaks the build.
- **Processor / rehype plugins don't hot-reload.** They're config-imported
  (`markdown.processor: unified({ rehypePlugins: [...] })`, the non-deprecated
  API), so editing a local plugin needs a **dev-server restart** — the page
  won't reflect the change on save.
- **Draft = 404 for free.** If the visibility filter (below) drops drafts from
  `getStaticPaths` in a prod build and there's no `fallback`, draft slugs are
  never generated → Astro's native `404.astro` serves them. Zero manual 404
  code: a route never enumerated in prod is simply not built. The same
  contract covers the sitemap — with `output: "server"` only prerendered
  routes are emitted, so an unbuilt draft URL can't leak in (no sitemap
  `filter` needed).

## Testable domain rules

Any predicate with branching (draft visibility, environment-gated filters, …)
is **extracted into a pure module** that takes the environment as a parameter
— `isPublished(entry, isProd)`, not a function that reads `import.meta.env`
inside. Two properties make it unit-testable:

- It **receives** the environment, so a test pins both prod and dev without
  touching globals.
- It does **not** import `astro:content`, so the test imports it directly with
  no collection to mock — the same split rationale as keeping head-SEO logic
  in a plain `.ts` beside the `.astro` head component.

Route every consumer through **one** shared helper (listing filter, detail
`getStaticPaths`, anything downstream) so the rule can't drift between call
sites. That single filter is what earns *draft = 404 for free* above: the same
check that hides a draft in the listing keeps its route out of
`getStaticPaths`.

## Schema-shape conventions

- **String-driven fields → loose schema.** For a field that selects a
  component option by name (`icon`, `variant`, …) use a plain `z.string()`,
  never `z.enum`. The name→value map and its type guard live in the
  **component**; an unknown value degrades to a **no-op** (render nothing, or a
  default), never a build error. The schema stays stable while the option set
  evolves — adding or renaming an option touches only the component's map, and
  content on an old name fails soft.
- **Nest a lone button under `action`, not `cta`.** A block already named for
  its purpose otherwise reads `cta.cta`; `action` kills the stutter. Applies to
  any block wrapping a single call-to-action, in either archetype.

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
