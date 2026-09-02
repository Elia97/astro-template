# Rendering & performance

## Rendering policy

- **`client:idle`, not `client:visible`, for anything mounting into a portal.** A
  closed dialog renders an empty portal — a zero-sized node — and
  `client:visible`'s IntersectionObserver may never fire on it.
- View transitions are on: `<ClientRouter />` in the layout's `<head>` (that's
  the documented placement — it emits meta tags). Consequences for scripts:
  inline scripts don't re-run on navigation (listen to `astro:after-swap`, as
  the theme script does); module scripts run once per module, not per page.
- **[HARD] Anything emitting a custom element goes in the `<body>`, never the
  `<head>`** — Vercel Analytics and Speed Insights are the usual case
  (`<vercel-analytics>`, `<vercel-speed-insights>`). A custom element is invalid
  in the head, so the parser closes the head at that point: the stylesheet
  `<link>` lands in the body and gets recreated from scratch on every view
  transition, which is a flash of unstyled content on each navigation.

## Bundle budget (`scripts/bundle-budget.mjs`)

`pnpm perf:bundle`, run by CI right after the build. It walks `dist/client`, and
for every emitted route measures the **static closure** — the chunks the page
reaches by following `import` edges only — in gzip bytes, then compares that to
the route's budget. Exit code 1 fails the job.

- **Static, not total.** A chunk reachable only through `await import()` is
  reported in the `DEFERRED` column and costs the budget nothing: it loads after
  paint, behind a runtime guard. Moving a heavy dependency behind a dynamic
  import is therefore the standard way to get back under budget.
- **The default is 20 KB gz**, sitting roughly 2× above the starter's heaviest
  route (`/contatti`, ~10 KB: ClientRouter + mobile-nav + the contact form). It's
  sized to catch a *dependency* entering the critical path, not single KBs.
- **A heavier route class** goes in front of the default in `BUDGETS`
  (`scripts/lib/bundle-budget.ts`) with its own `matches` — first match wins. A
  page that mounts an animation library belongs there rather than in a raised
  global default, so the rest of the site keeps the tight budget.
- **Expected routes are read off `src/pages`**, not listed by hand: a prerendered
  page that emits no HTML fails the gate, and an empty `dist/client` fails it
  too. Without that the per-route checks would be
  fail-open — they iterate the emitted pages, so measuring nothing would pass.
- **The stylesheet has its own budget**, checked once rather than per route:
  it is one shared file, so charging it to every page would read as if each one
  paid for it. It is in the gate because it is both the heaviest asset shipped
  and the only render-blocking one — Tailwind's output grows one utility at a
  time, so a fork drifts upward without any single change looking expensive.
- **Pages that opt out with `prerender = false`** are outside the budget by
  construction (no HTML to measure) and are listed in a `NOTE`, not counted as
  failures. Prerendering being the default is what keeps that hole small: a page
  that simply forgets to declare anything stays measured.

### What the budget does not see

It measures emitted chunks, so anything that never becomes one is invisible to
it. That is not a gap to fix — it's the shape of the measurement, and worth
knowing before reading a green report as "this page is light":

- **`is:inline` scripts.** The theme script is inlined into every page and Astro
  passes it through **verbatim** — not bundled, not minified, comments included.
  It costs bytes on every HTML response and shows up in none of the numbers.
  Keep it short, and keep its comments free of markup: they land in the document
  as literal text.
- **CSS.** The budget is client JS only.
- **Images and fonts.** Weight there is governed by `astro:assets` and the fonts
  API, not by this.

### Keeping a shared module client-safe

The one regression the budget reliably catches: a module imported by a client
script that pulls a heavy library in with it. A module-level call like
`z.string()` is **not** tree-shakeable — importing a single constant from that
file ships the whole library.

The worked example is the honeypot, split across `src/lib/forms/honeypot.ts`
(constant + predicate, zero imports) and `honeypot-schema.ts` (the zod shape).
Merging them back was measured: `/contatti` 9.8 → 22.1 KB gz, budget failed.

The rule that follows: **a module a client script imports may hold constants,
types and pure functions, but no module-level call into a dependency.** When a
shared name is needed on both sides, split the file rather than the name.

## Lighthouse audit

`output: 'static'` and `trailingSlash: 'never'` are what make a local audit
meaningful: `dist/client` served flat is byte-for-byte what the CDN serves. A
page that opted out with `prerender = false` is not, and shows up as a `NOTE` in
the bundle-budget report. One-shot, nothing added to the dependencies:

```bash
pnpm run build
pnpm dlx serve dist/client -l 4321
CHROME_PATH=<path to chromium> pnpm dlx lighthouse http://localhost:4321/ \
  --chrome-flags="--headless=new --no-sandbox --user-data-dir=/tmp/lh-profile" --quiet
```

- **`astro preview` does not work with the Vercel adapter** ("does not support
  the preview command"), which is why the build is served by a plain static
  server. Don't reach for LHCI's `staticDistDir` either: it serves through
  `express.static`, which 301s `/page` to `/page/` and pollutes the `redirects`
  audit on a `trailingSlash: 'never'` site.
- **[HARD] Under WSL, pin a Linux Chrome.** `chrome-launcher` finds the *Windows*
  Chrome through interop and prefers it; that binary reads a Linux user-data-dir
  as a UNC path, fails to resolve `%LOCALAPPDATA%` (hence paths like
  `undefined:\Users\undefined\...`), takes no lock and dies with "Unable to
  connect to Chrome", leaving behind directories with backslashes in their names
  that then trip `biome ci`. The giveaway in the log is a reference to
  `crashpad\...\file_io_win.cc`. Validate the binary with `--version` before
  using it: a cache can hold builds for another architecture (a puppeteer
  `linux_arm-*` binary is x86-64, and on aarch64 it fails with `Exec format
  error`).
- **Don't let Lighthouse spawn processes under WSL.** A `pnpm` spawned by it
  inherits that bogus `LOCALAPPDATA`; corepack uses it as its cache root even on
  Linux, fails to find pnpm, tries to redownload it under `/mnt/undefined/...`
  and dies with `EACCES`. Start the server yourself and hand Lighthouse a config
  without a `startServerCommand` — passing `--collect.url` on the CLI does *not*
  disable the one in the config file.
- **The score is an upper bound, not a field number.** The local server sends no
  compression, no CDN and none of the `vercel.json` headers, and with the
  tracking env vars unset neither the CMP nor GTM loads. Read it as a regression
  signal against the previous run.
- The default preset emulates **mobile**, which is the viewport that decides most
  LCP questions.
- Identifying the LCP element needs the JSON report — the terminal prints scores
  only. The audit id is **`lcp-discovery-insight`** (element snippet plus
  `requestDiscoverable`/`eagerlyLoaded`/`priorityHinted`); it replaced
  `largest-contentful-paint-element` in Lighthouse 13, and asking for the old id
  with `--only-audits` returns a report **silently missing** it.

## Resource hints

The template emits hints for one thing only: the consent/analytics origins, from
inside the `getTrackingConfig()` gate (`src/components/head/tracking.astro`), so
a project without tracking emits none at all. Rules for adding more:

- **`preconnect` only for origins loaded unconditionally.** It opens TCP+TLS
  eagerly; on an origin that may never be contacted, that's a wasted socket. The
  CMP qualifies outright — it loads on every page, pre-consent by definition.
- **`dns-prefetch` for consent-gated origins.** **[HARD]** A `preconnect` to
  `www.googletagmanager.com` sends SNI and the visitor's IP to Google *before*
  opt-in, which breaks the invariant the whole consent gate exists to hold
  (`deploy-ops.md` § Tracking). `dns-prefetch` only queries the visitor's own
  resolver, so the lookup is warm with no third-party contact.
- **Gate placement follows the origin, not the vendor.** Something contacted
  regardless of consent — an image CDN, say — must have its hint *outside* the
  tracking gate, or it would be missing in dev and on every preview without
  those env vars, which is exactly where the origin is still hit.
- **Never `crossorigin` on a hint for a non-CORS request.** It opens an
  *anonymous* connection that a plain `<script src>` won't reuse — two sockets,
  zero gain. Reserve it for fonts and CORS `fetch`.
- Pair every `preconnect` with a `dns-prefetch` on the same origin, as a fallback
  for browsers that ignore the former; those supporting both discard the dupe.
- Hints need no CSP entry (`default-src` doesn't govern them), but the origin is
  expected to be in the policy anyway, since something eventually loads from it.

## Motion system (`src/lib/motion/`)

- `index.ts` is the ONLY import point for consumers (`@/lib/motion`); internal
  modules import siblings directly, never the barrel (cycle risk).
- **[HARD]** `prefers-reduced-motion: reduce` disables ALL motion. The guards
  (`prefersReducedMotion()`, `isDesktopViewport()`, `hasFinePointer()`) are
  SSR-safe; `prefersReducedMotion()` is the first line of every motion setup.
- Client behavior convention: every interactive component keeps its logic in
  a sibling `.ts` module (`select-behavior.ts`, `lib/motion/reveal.ts`, …)
  exporting `bindX = createMotionBinding(setup, cleanup)`; the `.astro` file's
  script does only `import { bindX } … bindX()`. Keeps markup thin, cleanup
  guaranteed, and the logic unit-testable (vitest + happy-dom).
- `createMotionBinding(setup, cleanup)` is the lifecycle contract for
  per-component effects with `<ClientRouter />`:
  - `setup` runs immediately **and** `astro:page-load` also fires on the initial
    load — setup can run twice on a cold load and **must be idempotent**;
  - `cleanup` runs on `astro:before-swap` (tear down observers/rAF loops before
    the DOM swap, or they leak across navigations);
  - listeners are registered exactly once even if the component script re-runs.

## Reveal-on-scroll (`src/lib/motion/reveal.ts` + `src/components/ui/reveal.astro`)

- Attribute-driven: IO flips `data-reveal-ready`; the transition is pure CSS in
  `globals.css`, double-gated on `html.js` (no JS → content visible; the class
  is set pre-paint by `src/components/head/js-flag.astro`, deliberately separate
  from the theme script) and `@media (prefers-reduced-motion: no-preference)`
  (reduced → static).
- Two observers: the primary uses `rootMargin '0px 0px -15% 0px'`; elements that
  can never cross that shrunk boundary (bottom ~15% of the page at max scroll)
  go to a no-margin fallback — without it they'd stay hidden forever.
- **Cascade variant, without the wrapper component**: `data-reveal-stagger` on a
  container plus `style="--i: {index}"` on each child transitions them in
  sequence; `--reveal-stagger` overrides the 0.08s step. Same double gate and the
  same observers — the container takes `data-reveal-ready`, the children inherit
  the delay.
- **[HARD] Inside `<ul>`/`<ol>`/`<dl>` the cascade variant is the only admissible
  shape.** `<Reveal>` renders a `<div>`, and a `<div>` between a list and its
  `<li>` breaks the list semantics: assistive technology stops announcing the
  item count.
- Extending motion: build on `createMotionBinding` + the guards; keep the CSS
  initial state gated the same way. No animation library in the base scaffold.

## Motion: one-shot vs ongoing effects

- A **one-shot** effect (a reveal) is irreversible once it fires: its
  `prefers-reduced-motion` change listener only needs to gate *future* setups —
  don't arm reveals that haven't happened yet. It must still re-arm them when
  "reduce" goes off mid-session, or the CSS gate hides content no observer will
  ever reveal.
- An **ongoing/live** effect (scroll pinning, parallax, a running rAF loop) needs
  a **bidirectional** reduced-motion gate: the change listener tears the effect
  down live if the user switches "reduce" on mid-session, and re-wires it if
  switched off — not just a gate on future setups. **[HARD]** "reduce" disables
  ALL motion, including motion already running.
- `cleanup` must destroy whatever the third-party library created (observers, rAF
  loops, scroll controllers) — the binding contract guarantees cleanup runs, not
  that the library tore itself down.
- **Testing**: when an effect depends on real layout/rAF/geometry (which
  happy-dom can't provide), mock the third-party library rather than internal
  modules and assert the lifecycle contract against call counts — created on
  setup, killed/destroyed on cleanup, idempotent, reduced-motion bidirectional —
  not the visual result.

## Images

Local images live in `src/assets/**` and go through `astro:assets`
(`import { Image } from 'astro:assets'`); content-driven ones are referenced via
an `image()` schema field. Optimization runs at **build time** via Astro's
default Sharp service — add `sharp` as a devDependency when you adopt
`astro:assets` (prebuilt platform binaries, nothing to compile; the blank
scaffold ships no image pipeline). Prerendered pages emit pre-generated
responsive variants into `dist/_astro/`, served as static files.

- Deliberately NOT the Vercel adapter's `imageService: true`: build-time/static
  variants keep the template portable to non-Vercel hosts and off the Vercel
  Image-Optimization runtime quota. Four things change the moment a fork turns it
  on, all of them silent: no variant is emitted at build any more (the source is
  copied byte for byte and `<Image>` emits `/_vercel/image?url=…` resolved per
  request); **`format` stops entering the URL** — Vercel picks AVIF/WebP off the
  `Accept` header, so a `<picture>` with an AVIF and a WebP `srcset` emits two
  identical sources; **`quality` defaults to 100** unless passed; and **`widths`
  is filtered against the adapter's own list**, not rounded to it — `[640, 1024,
  1600, 2400]` survives as `[640]`, leaving a full-screen lightbox with a single
  640w source, with nothing failing.
- **A remote host needs the right allowlist for the path it takes.** Through
  `<Image>`/`getImage()` it goes in `image.remotePatterns`; missing there,
  `inferRemoteSize` throws *after* the headers have flushed and the page returns
  **200 with an empty body**. A host served through a raw `<img>` never touches
  the image service and belongs in the CSP's `img-src` instead.
- Author `<Image>` with explicit `widths` + `sizes` (and a low `quality` for
  photographic art) so the build emits a right-sized srcset.
- Always pass a meaningful `alt`; empty string only for purely decorative
  images. Content-driven images carry their alt as a sibling schema field
  (e.g. `imageAlt`), forwarded with `alt={imageAlt ?? ''}`.
- **A list of content images is `array<{ src, alt }>`, never `array<string>`.**
  The moment the alt has nowhere to live in the schema, the markup invents one —
  and an alt written in a component is the same sentence on every entry.
- Type it `z.string()` **without** `.min(1)`: an empty alt is the right answer for
  a decorative image (which also takes `aria-hidden`), and the point is to force
  the author to choose. Within one gallery each alt must be **distinct** — screen
  readers and Google Images both read them as a list.
