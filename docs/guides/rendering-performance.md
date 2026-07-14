# Rendering & performance

## Rendering policy

- `output: 'server'` — pages are SSR by default. Pages that don't depend on
  per-request data opt into static rendering with an explicit
  `export const prerender = true` in the frontmatter (the homepage does).
- View transitions are on: `<ClientRouter />` in the layout's `<head>` (that's
  the documented placement — it emits meta tags). Consequences for scripts:
  inline scripts don't re-run on navigation (listen to `astro:after-swap`, as
  the theme script does); module scripts run once per module, not per page.

## Motion system (`src/lib/motion/`)

- Module layout: `index.ts` is the barrel and the ONLY import point for
  consumers (`@/lib/motion`); internals live in leaf modules — `binding.ts`
  (bind-once factory), `media-queries.ts` (environment guards), `reveal.ts`
  (reveal-on-scroll setup). Internal modules import siblings directly, never
  the barrel (cycle risk).
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

## Reveal-on-scroll (`src/lib/motion/reveal.ts` + `src/components/reveal.astro`)

- Attribute-driven: IO flips `data-reveal-ready`; the transition is pure CSS in
  `globals.css`, double-gated on `html.js` (no JS → content visible; the class
  is set pre-paint by `src/components/js-flag.astro`, deliberately separate
  from the theme script) and `@media (prefers-reduced-motion: no-preference)`
  (reduced → static).
- Cascade variant without the wrapper component: `data-reveal-stagger` on any
  container + `style="--i: {index}"` on each child transitions the children in
  sequence; `--reveal-stagger` overrides the 0.08s step. Same double gate, same
  observers (the container gets `data-reveal-ready`, children inherit delays).
- Two observers: the primary uses `rootMargin '0px 0px -15% 0px'`; elements that
  can never cross that shrunk boundary (bottom ~15% of the page at max scroll)
  go to a no-margin fallback — without it they'd stay hidden forever.
- A `matchMedia` change listener re-arms reveals if the user turns
  reduced-motion off mid-session (the CSS gate starts hiding content that no
  observer would ever reveal).
- Extending motion: build on `createMotionBinding` + the guards; keep the CSS
  initial state gated the same way. No animation library in the base scaffold.

## Motion: one-shot vs ongoing effects

- A **one-shot** effect (a reveal) is irreversible once it fires: its
  `prefers-reduced-motion` change listener only needs to gate *future* setups —
  don't arm reveals that haven't happened yet.
- An **ongoing/live** effect (scroll pinning, parallax, a running rAF loop) needs
  a **bidirectional** reduced-motion gate: the change listener tears the effect
  down live if the user switches "reduce" on mid-session, and re-wires it if
  switched off — not just a gate on future setups. **[HARD]** "reduce" disables
  ALL motion, including motion already running.
- Both use the same `createMotionBinding(setup, cleanup)` contract: `setup` stays
  idempotent (it can run twice on a cold load); `cleanup` on `astro:before-swap`
  destroys any instances the third-party library created (observers, rAF loops,
  scroll controllers) before the DOM swap, or they leak across navigations.
- **Bundle budget**: heavy animation/scroll libraries stay confined to the bundle
  of the page that uses them — never imported into the global/critical bundle.
  None ships in the base scaffold.
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
  Image-Optimization runtime quota.
- Author `<Image>` with explicit `widths` + `sizes` (and a low `quality` for
  photographic art) so the build emits a right-sized srcset.
- Always pass a meaningful `alt`; empty string only for purely decorative
  images. Content-driven images carry their alt as a sibling schema field
  (e.g. `imageAlt`), forwarded with `alt={imageAlt ?? ''}`.
