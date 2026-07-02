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

- **[HARD]** `prefers-reduced-motion: reduce` disables ALL motion. The guards in
  `src/lib/motion/index.ts` (`prefersReducedMotion()`, `isDesktopViewport()`,
  `hasFinePointer()`) are SSR-safe; `prefersReducedMotion()` is the first line
  of every motion setup.
- `createMotionBinding(setup, cleanup)` is the lifecycle contract for
  per-component effects with `<ClientRouter />`:
  - `setup` runs immediately **and** `astro:page-load` also fires on the initial
    load — setup can run twice on a cold load and **must be idempotent**;
  - `cleanup` runs on `astro:before-swap` (tear down observers/rAF loops before
    the DOM swap, or they leak across navigations);
  - listeners are registered exactly once even if the component script re-runs.

## Reveal-on-scroll (`src/components/reveal.astro`)

- Attribute-driven: IO flips `data-reveal-ready`; the transition is pure CSS in
  `globals.css`, double-gated on `html.js` (no JS → content visible) and
  `@media (prefers-reduced-motion: no-preference)` (reduced → static).
- Two observers: the primary uses `rootMargin '0px 0px -15% 0px'`; elements that
  can never cross that shrunk boundary (bottom ~15% of the page at max scroll)
  go to a no-margin fallback — without it they'd stay hidden forever.
- A `matchMedia` change listener re-arms reveals if the user turns
  reduced-motion off mid-session (the CSS gate starts hiding content that no
  observer would ever reveal).
- Extending motion: build on `createMotionBinding` + the guards; keep the CSS
  initial state gated the same way. No animation library in the base scaffold.

## Images

No image pipeline conventions yet — none shipped. Use `astro:assets` when real
images land, and codify the pattern here.
