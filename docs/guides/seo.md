# SEO

Conventions established by the centralized head (`src/components/head.astro`).

## Head contract

- `head.astro` is the single place for title/description/canonical/OG/Twitter/
  JSON-LD/hreflang. Pages pass SEO props to the **layout**
  (`src/layouts/main.astro`), which forwards them — pages never render
  `head.astro` directly.
- `<meta charset>` and `<meta viewport>` live in the **layout**, before the
  inline theme script: the encoding declaration must sit within the first
  1024 bytes of the document. Don't move them into `head.astro`.

## URL policy (canonical / hreflang)

- `trailingSlash: 'never'` in `astro.config.mjs` is the sitewide policy. The
  Vercel adapter turns it into a platform-level 308 (`/(.*)/$ → /$1`) — don't
  add manual redirects.
- Canonical **and** hreflang alternates are both built via `getAbsoluteLocaleUrl`
  on a locale-agnostic path (current locale prefix stripped, trailing slash
  normalized). Never hand-build a canonical from raw `Astro.url.pathname`: raw
  paths and `astro:i18n` URLs disagree on slashes and locale prefixes, and
  Google ignores hreflang that doesn't point at the canonical.
- `SITE.localeTags` maps locale **codes** (for object locale entries that's
  `codes[0]`, not `path`) to BCP 47 tags used for `lang`, `hreflang` and
  `og:locale` (underscore form). `x-default` points at the default locale.

## JSON-LD

Pass structured data as objects via the layout's `jsonLd` prop. `head.astro`
escapes `<` (as the `<` unicode escape) before `set:html` — content can't
close the script element early. Never `set:html` raw `JSON.stringify` output
anywhere else.

## OG / social

- OG and Twitter image URLs are always absolute, built from `SITE.url`.
- `public/og-default.png` is a solid-color 1200×630 placeholder — **replace it
  per fork**, and keep `SITE.defaultOgImage` pointing at a file that exists
  (a dead og:image fails social card validators).

## Not yet in place

No sitemap integration — `head.astro` deliberately has no
`<link rel="sitemap">`. Add both together when `@astrojs/sitemap` (or
equivalent) lands.
