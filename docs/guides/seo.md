# SEO

Conventions established by the centralized head (`src/components/head.astro`).

## Head contract

- `head.astro` is the single place for title/description/canonical/OG/Twitter/
  JSON-LD/hreflang. Pages pass SEO props to the **layout**
  (`src/layouts/main.astro`), which forwards them — pages never render
  `head.astro` directly.
- Internally it's a thin orchestrator: URL/meta resolution is a pure function
  (`head-seo.ts` → `resolveHeadSeoMeta`, unit-tested in `head-seo.test.ts`);
  rendering is split per concern (`head-{alternates,og,twitter,json-ld}.astro`).
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
`head-json-ld.astro` escapes `<` (as the unicode escape) before `set:html` —
content can't close the script element early. Never `set:html` raw
`JSON.stringify` output anywhere else. Sitewide schemas (Organization from
`src/lib/company.ts` + WebSite) live on the homepage only; inner pages build
their own with `buildBreadcrumbList`/`buildItemList` from `src/lib/seo.ts`.

For a listing → detail route pair, the **listing** emits `BreadcrumbList` +
an `ItemList` of its children (the catalog); each **detail** emits the
single-entity schema (`Service`, `Article`, …) + its own `BreadcrumbList`.
Don't replicate the full entity on the listing — the authoritative instance
belongs to its detail URL. Entity builders in `src/lib/seo.ts` absolutize
their URLs against `SITE.url` and fill `provider`/`author`/`publisher` from
the single company source (`src/lib/company.ts`).

## OG / social

- OG and Twitter image URLs are always absolute, built from `SITE.url`.
- `public/og-default.png` is a solid-color 1200×630 placeholder — **replace it
  per fork**, and keep `SITE.defaultOgImage` pointing at a file that exists
  (a dead og:image fails social card validators).

## Sitemap & robots

- `@astrojs/sitemap` (astro.config.mjs) emits `sitemap-index.xml` at build
  time — dev never serves it. Its locale map mirrors `SITE.localeTags`.
- With `output: 'server'` only **prerendered** routes end up in the sitemap:
  keep indexable pages `prerender = true` (the norm here), or list SSR-only
  URLs via the integration's `customPages`.
- `src/pages/robots.txt.ts` (prerendered) points crawlers at the sitemap and
  allows everything: per-response indexing control does NOT belong there.
- Excluding a page from search takes BOTH sides: `filter` in the sitemap
  config AND the path in `NOINDEX_PATHS` (`src/middleware.ts`).
- That mirror is only for routes that **are** built but must stay unindexed.
  A route never enumerated by `getStaticPaths` in production (e.g. a draft
  gated out by a visibility predicate) needs neither side: only prerendered
  routes reach the sitemap, so a URL that's never built can't appear in it —
  no `filter` required.

## Preview deploys

`src/middleware.ts` sets `X-Robots-Tag: noindex, nofollow` whenever the host
ends in `.vercel.app` — preview/branch deploys must never compete with the
production domain in search indexes. Nothing to configure per fork.
