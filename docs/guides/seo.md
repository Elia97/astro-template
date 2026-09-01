# SEO

Conventions established by the centralized head (`src/components/head/head.astro`).

## Head contract

- `head.astro` is the single place for title/description/canonical/OG/Twitter/
  JSON-LD/hreflang. Pages pass SEO props to the **layout**
  (`src/layouts/main.astro`), which forwards them — pages never render
  `head.astro` directly.
- Internally it's a thin orchestrator: URL/meta resolution is a pure function
  (`head/seo.ts` → `resolveHeadSeoMeta`, unit-tested in `head/seo.test.ts`);
  rendering is split per concern (`head/{alternates,og,twitter,json-ld}.astro`).
  Extend by adding meta to the right subcomponent — don't grow the orchestrator.
- `<meta charset>` and `<meta viewport>` live in the **layout**, before the
  inline theme script: the encoding declaration must sit within the first
  1024 bytes of the document. Don't move them into `head.astro`.

## URL policy (canonical / hreflang)

- `trailingSlash: 'never'` in `astro.config.mjs` is the sitewide policy. The
  Vercel adapter turns it into a platform-level 308 (`/(.*)/$ → /$1`) — don't
  add manual redirects.
- Canonical **and** hreflang alternates are both built via `getAbsoluteLocaleUrl`
  on a locale-agnostic path (`localeAgnosticPath` in `src/i18n/path.ts`:
  current locale prefix stripped, localized segments canonicalized, trailing
  slash normalized), then re-localized per locale (`translatePath`). Never
  hand-build a canonical from raw `Astro.url.pathname`: raw paths and
  `astro:i18n` URLs disagree on slashes and locale prefixes, and Google
  ignores hreflang that doesn't point at the canonical.
- `SITE.localeTags` maps locale **codes** (for object locale entries that's
  `codes[0]`, not `path`) to BCP 47 tags used for `lang`, `hreflang` and
  `og:locale` (underscore form). `x-default` points at the default locale.

## JSON-LD

Pass structured data as objects via the layout's `jsonLd` prop.
`head/json-ld.astro` escapes `<` (as the unicode escape) before `set:html` —
content can't close the script element early. Never `set:html` raw
`JSON.stringify` output anywhere else. The sitewide schemas (Organization, built
from `COMPANY` + `SITE`, and WebSite) are declared inline in
`src/pages/index.astro` and live on the homepage only. `src/lib/seo/json-ld.ts`
ships the two list builders — `buildBreadcrumbList` and `buildItemList` — which
absolutize their URLs against `SITE.url`; a fork adds its own entity builders
there.

For a listing → detail route pair, the **listing** emits `BreadcrumbList` +
an `ItemList` of its children (the catalog); each **detail** emits the
single-entity schema (`Service`, `Article`, …) + its own `BreadcrumbList`.
Don't replicate the full entity on the listing — the authoritative instance
belongs to its detail URL.

### One company, one entity (when a fork adds a second)

The moment the company appears in more than one place — a `LocalBusiness` on the
contact page, or a compact reference used as `author`/`publisher`/`provider` —
the nodes need stable `@id`s (`${SITE.url}/#organization`) and the secondary one
hangs off the first via `parentOrganization`.

- **The `@id` is an identifier, not a navigable URL.** That fragment resolves to
  nothing, deliberately.
- **[HARD] The same `@id` merges the nodes**, so `name` and `legalName` must be
  **identical** in the compact reference and in the full node — differing, the
  merge yields one entity carrying two names.
- **A `logo` must sit on a light background.** Google paints it on its own white
  panel, where a white-on-transparent wordmark disappears. Assert the file exists
  in `public/` from a test: a 404 logo fails silently, like the manifest icons
  above.
- **A `name` coming from a content field goes through a single-line normalizer.**
  YAML block scalars keep their newlines, and one reaching a `<title>` or a
  schema `name` prints there verbatim.

## OG / social

- OG and Twitter image URLs are always absolute, built from `SITE.url`.
- `public/og-default.png` is a solid-color 1200×630 placeholder — **replace it
  per fork**, and keep `SITE.defaultOgImage` pointing at a file that exists
  (a dead og:image fails social card validators).

## Icons, manifest & theme-color

`head/icons.astro` carries the document's identity — favicons, the manifest link
and the browser-chrome colour — and is rendered once from `head.astro`.

- **The manifest is built, not authored.** `src/lib/seo/manifest.ts` derives it from
  `SITE` (name, description, lang, colours) and
  `src/pages/site.webmanifest.ts` serves it prerendered, so the installed
  identity can't drift from the site's own.
- **`id`, `start_url` and `scope` are pinned at `/`.** Changing `id` makes
  browsers treat the site as a different app: an existing install stops updating
  and the prompt comes back.
- **`manifest.test.ts` holds every declared icon to actually existing.** An icon
  listed but not shipped is a 404 the browser only reports at install time,
  where nobody is looking — which is why the list is short rather than
  aspirational.
- **Out of the box the manifest is valid but not installable.** It declares the
  SVG favicon only; Chrome's install prompt wants a raster of at least 192px.
  A fork adds `/icon-192.png`, `/icon-512.png` and a maskable 512 (content
  inside the centered 80% safe zone, opaque — Android's adaptive mask clips the
  rest) and lists them in `ICONS`.
- **`SITE.themeColor` must equal `--background`** in `light.css`/`dark.css`, or
  the browser chrome and the page disagree at the seam. It's hex, not oklch:
  `<meta name="theme-color">` is parsed by the browser UI layer, where support
  is narrower than in CSS.

## Sitemap & robots

- `@astrojs/sitemap` (astro.config.mjs) emits `sitemap-index.xml` at build
  time — dev never serves it. Its locale map mirrors `SITE.localeTags`.
- **A media sitemap needs its own endpoint.** The integration's `serialize` hook
  cannot emit a `<video:…>` or `<image:…>` namespace: its `SitemapItem` type is a
  `Pick` of `url|lastmod|changefreq|priority|links` and nothing else. Emit that
  sitemap from a route of its own and attach it through `customSitemaps`.
- **Media schema fields carry the platform's limits, enforced at build.** Google
  caps a video `name` at 100 characters and a `description` at 2048: put those in
  the Zod schema rather than truncating at serialization — failing the build
  beats shipping a silently cut string into the XML. Same rule for the JSON-LD
  and the sitemap describing the **same** set: resolve both from one function, or
  they drift into describing different media.
- Only **prerendered** routes end up in the sitemap: keep indexable pages
  prerendered (the default), or list on-demand URLs via the integration's
  `customPages`.
- `src/pages/robots.txt.ts` (prerendered) points crawlers at the sitemap and
  reads its disallow list from `crawl-policy.ts`: per-response indexing control
  does NOT belong there (crawlers cache robots.txt).
- **`src/lib/seo/crawl-policy.ts` is the single source of truth**, feeding
  `robots.txt`, the sitemap `filter` and the middleware. Two lists:
  `ROBOTS_DISALLOWED_PATHS` (blocked at the crawler, never fetched) and
  `NOINDEX_PATHS` (crawlable, kept out of the index — the page still has to pass
  `noindex` to the layout: **the meta tag is what carries the signal**, and the
  only mechanism that works on a prerendered page). Both feed
  `SITEMAP_EXCLUDED_PATHS`, both ship empty, and matching is by subtree and has
  to stay that way — `/area-riservata` covers `/area-riservata/documenti`. An
  exact match would leave every child indexable while nothing fails, which is
  why `matchesSubtree` carries a `[HARD]` note.
- `X-Robots-Tag` from `src/middleware.ts` also reads `NOINDEX_PATHS`, but only
  ever reaches a **non-HTML SSR response** (a generated feed, a JSON endpoint)
  where no meta tag can exist. It does not run for a prerendered page.
- Exclusion is only for routes that **are** built but must stay unindexed.
  A route never enumerated by `getStaticPaths` in production (e.g. a draft
  gated out by a visibility predicate) needs neither side: only prerendered
  routes reach the sitemap, so a URL that's never built can't appear in it —
  no `filter` required.

## Preview deploys

A `has: host` header rule in `vercel.json` sets `X-Robots-Tag: noindex, nofollow`
on every `*.vercel.app` host — preview/branch deploys must never compete with the
production domain in search indexes. Nothing to configure per fork.

It lives at the edge, **not** in `src/middleware.ts`: for a prerendered page the
middleware runs once at build time and its response headers are discarded into a
static file, so a middleware check would have covered only on-demand routes.
`src/vercel-robots.test.ts` pins the rule and asserts it never matches the custom
domain — the failure that would drop the live site out of every index.
