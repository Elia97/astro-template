# UI components

Conventions established by the base scaffold (design tokens, layout chrome).
Cross-ref: `rendering-performance.md` (motion/reveal lifecycle), `seo.md` (head contract).

## Design tokens — three tiers, one rebrand surface

- `src/styles/tokens.css` — raw oklch primitives, the stacking ladder and
  `--radius`. **This is the only file to touch when rebranding a fork**, and the
  `--brand-*` ramp is what makes that literally true: `--primary`, `--accent` and
  `--ring` map onto it rather than onto `--neutral-*`, so giving a client their
  colour never means editing `light.css`/`dark.css`. It ships holding the neutral
  values, so the default look is achromatic — replace the steps, not the roles.
  Token names follow the Tailwind scale step they hold (`--neutral-700` =
  Tailwind's neutral-700 value; a mislabeled step is a bug, not a taste choice).
- **Status roles come in two steps, and so does their foreground.** `destructive`
  and `success` are each a darker step for light and a lighter one for dark,
  because no single value clears 4.5:1 on both — and since the same token is both
  text (`text-destructive`) and fill (`bg-destructive`), the dark theme flips its
  foreground to a dark one. `src/styles/contrast.test.ts` holds every pair.
- **`z-*` comes from the ladder in `tokens.css`**, not from a number that
  happened to work: `--z-raised` < `--z-dropdown` < `--z-header` < `--z-overlay`
  < `--z-skip-link`. Place a new overlay by reading it, and reach it through the
  named `z-*` utilities in `globals.css` — never an arbitrary `z-[…]`.
- **Timing and easing are tokens like the colours**, and `tokens.css` is the only
  sheet allowed to spell one out: `--ease-emphasized` and `--duration-slower`
  live there, the effect sheets consume them. `src/styles/motion.test.ts` holds
  it — a `cubic-bezier(` or a literal duration in a `transition`/`animation`
  fails there. A `var(--x, 0.08s)` fallback is exempt: that is one instance's
  default, not a timing of the system. A fork adding more steps names them off
  the same two axes; declaring them in `@theme` instead of `:root` also generates
  the matching `ease-*` utility, which `:root` does not.
- `src/styles/light.css` / `dark.css` — semantic role mapping (shadcn naming:
  `--background`, `--primary`, `--destructive`, …). **Never rename these keys**;
  components and utilities assume them. Dark overrides the same keys under `.dark`.
- `src/styles/globals.css` — orchestrator: `@import` chain, `@custom-variant dark`
  (official v4 form `&:where(.dark, .dark *)`), `@theme inline` remap to utilities,
  base layer, motion CSS.

Gradient tokens obey the same tier logic — the tier IS the theme decision. A
gradient that must react to the theme lives in `light.css`/`dark.css` with a dark
override; a gradient FIXED across themes by explicit product decision lives in
`tokens.css` with no override. Consume either through Tailwind's arbitrary-property
syntax `bg-(image:--gradient-name)` — the `image:` cast is required, a gradient is a
`background-image`, not a color.

Biome parses Tailwind directives via `css.parser.tailwindDirectives` in
`biome.json` — don't remove it, `@theme`/`@apply` fail to parse without it.

## Dark mode

- Theme = `.dark` class on `<html>`, toggled by `src/components/head/theme-script.astro`
  (inline anti-FOUC in `<head>`, delegated `[data-theme-toggle]` click handler,
  re-applied on `astro:after-swap`).
- Both themes declare `color-scheme` so native UI (form controls, scrollbars)
  follows the theme.
- Toggle buttons carry `aria-pressed`, synced by the theme script — new toggles
  only need the `data-theme-toggle` attribute plus an initial `aria-pressed="false"`.
- The two `theme-color` metas (`head/icons.astro`) ship with a
  `prefers-color-scheme` media query — the correct no-JS default, but it ignores
  the toggle. The script flips `media` between `all` and `not all` so the browser
  chrome follows the applied theme. It re-runs on `DOMContentLoaded` for a
  reason: on a cold load the inline script executes in `<head>` *before* the
  parser reaches those metas, so the first pass finds nothing to sync and the
  chrome would keep following the system preference.

## Contrast on composite backgrounds

**Over a gradient, a glass panel or a photo, text does not take opacity — it
takes a solid token.** An alpha that reads fine over the darkest stop collapses
over the lightest one: the same `white/55` can go from ~6:1 to ~2.3:1 across one
gradient, and no alpha short of full opacity recovers 4.5:1 at the light end.

Lighthouse will not catch this. It doesn't compose alpha over a gradient or an
image, so the page audits clean while failing WCAG 1.4.3 in practice. If a fork
introduces composite backgrounds, the contract has to live in a unit test that
computes relative luminance → alpha-over → ratio for each pair, asserted against
the **worst** stop, not the average one.

- **Borders may stay alpha** — a solid border turns a field into a filled box —
  but size them against WCAG 1.4.11's 3:1 on *both* sides: the fill inside and
  the background outside.
- **The flat token pairs already have that test**: `src/styles/contrast.test.ts`
  parses `tokens.css` + `light.css`/`dark.css` and asserts every
  foreground/background pair at 4.5:1 and every control boundary at 3:1, in both
  themes. A rebrand that drops one below the floor fails there. Two consequences
  of it worth knowing before "tidying" them back together: `--border` and
  `--input` are different tokens on purpose (a divider vs a control boundary),
  and `--destructive` needs a lighter step in dark **with the foreground flipped
  to a dark one**, because the same token is text (`text-destructive`) and fill
  (`bg-destructive`).
- **The one derogation is large text** (≥24px, or ≥18.7px bold), where 1.4.3
  asks 3:1 rather than 4.5:1 — and only where the floor is asserted against the
  worst stop. Below that size the derogation doesn't exist.
- A `bg-clip-text` gradient headline is the legitimate case for alpha: there the
  transparency *is* the effect, and a solid token would erase it.

## Chrome content

Header/footer/skip-link structure comes from `src/lib/site.ts` (`SITE`): nav,
CTA, legal links, socials. Copy is NOT there — entries carry i18n dictionary
keys resolved via `useTranslations(Astro.currentLocale)`
(`src/i18n/strings/<locale>.ts`). No hardcoded labels in components; internal
links go through `localizedHref()` so they localize with the site.

## Tailwind v4 idioms adopted (don't regress to v3 habits)

- **Never `outline-none`.** A `ring` is a box-shadow, and box-shadows are dropped
  in forced-colors mode: `outline-none` there leaves a control with no focus
  indicator at all. `focus-visible:outline-hidden` keeps a *transparent* outline
  that Windows High Contrast repaints, which is why every focus style in the
  primitives pairs the two.
- **Prefer `outline` over `ring` for anything not a form control.** An outline
  sits in the gap and shows the real backdrop; a ring offset has to guess a
  background colour the component can't know, and gets it wrong the moment the
  control lands on a gradient or a coloured band. `.focus-ring` (`globals.css`)
  is the outline-based utility for custom focusables. The primitives keep
  `focus-visible:ring-2 ring-ring` because there the focus style doubles as a
  glow around the field border — a legitimate use, not a leftover.
- Logical properties for the inline axis (`start-4`, `ms-*`) — the template is
  i18n-ready and must survive an RTL locale.
- `overflow-wrap: anywhere`, not `break-word`, when a long token must not blow up
  a flex or grid track: only `anywhere` lowers the box's *minimum* content size,
  which is what the track is measured against.
- `min-h-svh` for full-viewport shells (stable on mobile; `dvh` janks on scroll,
  `100vh` overflows under the expanded URL bar).
- Current utility names: `backdrop-blur-sm` (bare `backdrop-blur` is the
  deprecated v3 compat alias).
- Numeric utilities are dynamic in v4 (`z-100` compiles without config).

## Accessibility patterns in the chrome

- `src/components/layout/skip-link.astro`: first focusable element, targets
  `<main id="main-content" tabindex="-1">` (tabindex is what makes real focus
  move). Hidden via `sr-only`, restored with `focus:`-prefixed utilities —
  remember `not-sr-only` resets padding, so padding must also be focus-prefixed.
- Icon glyphs are `aria-hidden` with the label on the control; text-presentation
  variation selector (`&#xFE0E;`) on codepoints WebKit would render as emoji.
- Overlay building blocks (for menus/dialogs a fork adds):
  `lib/overlay/trap-focus.ts` (`cycleFocus` — call from the container's keydown,
  Tab wraps at both ends) and `lib/overlay/scroll-lock.ts` (reference-counted
  `lockScroll`/`unlockScroll`; `resetScrollLock()` on `astro:after-swap` so locks
  never leak across view transitions).
- **[HARD] Every programmatic `focus()` takes `{ preventScroll: true }`.** The
  browser scrolls a focused element into view: opening a panel scrolls its own
  container, and restoring focus on close jumps the page to wherever the previous
  element sits — which, after any scrolling, is off screen. `route-focus.ts` and
  `mobile-nav.ts` both do this.
- **Bind an overlay's toggle to `click`, not `pointerup`.** On touch the
  `pointerup` fires first and the `click` that follows lands on whatever is now
  under the finger, reopening what was just closed.
- **A full-screen `<dialog>` is its own backdrop as far as the event target
  goes.** The dialog element fills the viewport, so a click outside the content
  targets the *dialog*, never `::backdrop` — compare against the content's
  bounding box instead of testing the target for the backdrop.
- **A `<video>` with its source still attached keeps buffering after the overlay
  closes.** Detach it (or pause and clear `src`) on close, or a closed lightbox
  keeps pulling bytes.
- **Focus after a client-side navigation** (`lib/a11y/route-focus.ts`, bound once
  in the layout). `<ClientRouter />` restores focus only inside
  `[data-astro-transition-persist]` subtrees and the template has none, so without
  this every navigation drops focus to `<body>` (WCAG 2.4.3). The hash exception
  and why it is not `createMotionBinding` are documented at the binder.

## Named view transitions (when a fork adds them)

The template ships `<ClientRouter />` with its default cross-fade and **no named
groups**. Once a fork starts naming elements, each rule below is a failure that is
easier to inherit than to rediscover.

**Surfaces and text are two behaviours, not one.**

- *Surfaces* (bands, cards, covers) cross-fade **simultaneously and
  complementarily** while they morph: same duration, same easing, opposite
  keyframes, so the two opacities always sum to 1. Sequencing the fades (old out,
  *then* new in) reopens the blank flash. The fade isn't decoration — it hides
  the fact that two snapshots of different proportions can't line up while the
  group interpolates; without it the scaling reads as a tear.
- *Text and chrome* must **not** cross-fade: old discarded on the first frame,
  new opaque from the first frame. Cross-fading text prints two *different*
  headings on top of each other. A band's heading also skips the geometric morph
  — it has to land in place, not fly in from wherever it sat on the previous page.
- Consequence: **a new band is split into two groups**, one for the surface and
  one for the text container. Keeping them in a single group is what produces the
  smeared double heading.

Rules that keep it from breaking:

- **A duplicated `view-transition-name` on one page invalidates the entire
  transition.** Per-slug names are safe only while each slug appears once — a
  "related items" list must exclude the current one.
- **Declare the stacking, don't inherit it.** Paint order defaults to the capture
  DOM, which isn't comparable between two different pages: a full-width band ends
  up over the very thing flying into it. Order from the bottom: root, band
  surfaces, everything that travels page to page, band text, chrome.
- **Guard named elements that are off-screen.** Leaving a scrolled page, a named
  element is captured out of view and its group slides it in on the new page.
  Clear the name on `astro:before-preparation` for elements outside the viewport.
- **Static names only, never per-slug lists in CSS.** A per-slug name can't carry
  a behaviour in the stylesheet. For a title that flies, assign one static name
  at click time to the clicked source only.
- **`transition:persist` is not the alternative for chrome.** A header that
  changes classes per page would keep the previous page's paint. Astro's
  `transition:animate="none"` doesn't help either: it emits into `@layer astro`,
  which loses against non-layered wildcards.

## UI primitives (`src/components/ui/`)

Native `.astro` files using `cva` variants + `cn()` (`src/lib/utils.ts`,
clsx + tailwind-merge) — shadcn's API shape without the React/Radix runtime:

- Variants are exported from the component's frontmatter
  (`import Button, { buttonVariants } from '@/components/ui/button.astro'`)
  for the rare case where only the classes are needed.
- Polymorphism replaces Radix `asChild`: `<Button as="a" href=...>`. The `as`
  union is explicit (`'button' | 'a'`) rather than Astro's generic
  `Polymorphic` helper — `astro check` (0.9.x) doesn't resolve generic Props
  at call sites; don't switch back without verifying that's fixed.
- Compound families live in a folder with a barrel
  (`ui/card/{card,header,…}.astro` + `index.ts`), so consumption is a
  shadcn-shaped one-liner: `import { Card, CardHeader } from '@/components/ui/card'`.
  Props typing survives the `.ts` re-export (verified against `astro check`).
  Simple primitives stay flat files.
- Compound primitives (unopinionated LEGO, caller owns structure) vs named
  slots (fixed layout, component owns structure): primitives use the former;
  opinionated page sections are where named slots belong.
- Every primitive accepts a `class` override, merged last through `cn()` —
  callers can restyle without forking the primitive.
- New primitives follow the same recipe; keep variant strings on semantic
  tokens only (never raw palette values) and `focus-visible:outline-hidden`
  (see the idioms above).
- Layout lives in `Container` + `Section` only, never hand-written: page sections
  compose `<Section><Container>…</Container></Section>` and generator templates
  must emit that shape. Both primitives document the width/rhythm rationale and
  the rare narrower block's nested `max-w-*` escape hatch in their own headers.
- Button sizes are one t-shirt scale, `sm/md/lg/xl` plus square `icon-*`
  twins (`md` is the default — no `default` size key; variant names DO keep
  shadcn's `default`). Beyond the shadcn set: `variant="soft"` is a low-emphasis
  filled control (semantic tokens only, NO baked text color — an icon/social glyph
  inherits `currentColor`), and a `shape` axis (`default`/`pill`) swaps only the box
  radius (`pill` = `rounded-full`).
- Form fields compose the `Field` compound (`ui/field/`: `Field` +
  `FieldLabel` + `FieldContent` + `FieldError`, vertical/horizontal
  orientation) around the flat controls (`input.astro`, `textarea.astro`,
  `select.astro`). `FieldError` is the only part with behaviour attached — see
  `forms-email.md` § Validation surface for its contract and the test guarding it.
- `Select` is the reference progressive-enhancement primitive: the native
  `<select>` renders first and stays the form-facing source of truth; the
  script layer (`select-behavior.ts`) swaps in a styled trigger + listbox
  (roving focus, `aria-expanded`/`aria-selected`, Escape/Tab/outside-click)
  and re-dispatches `change` on the native element. New stateful primitives
  follow this shape: no-JS baseline first, behavior in a sibling
  `*-behavior.ts` bound via `createMotionBinding`
  (see `rendering-performance.md`).
- Icons come from `@lucide/astro` (build-time SVG, zero client JS): default
  `stroke-width={1}`, size via Tailwind (`size-4`/`size-5`), `aria-hidden` by
  default with the accessible label on the control.

If a fork needs a genuinely stateful component (Dialog, Calendar, …), see the
islands gotchas in `ARCHITECTURE.md`.

## Page-section layout patterns

### Full-bleed bands — break out of `Container`

Some bands must span (near) the full viewport instead of the breakpoint-snapped
`Container` width (a full-bleed CTA banner, a footer). Wrap them in
`<Section spacing="none">` (or a bare landmark like `<footer>`) **without**
`Container` — Container would cap them at the snapped width and defeat the intent.
This is the inverse of the "rare narrower block" note under UI primitives: there you
nest a `max-w-*` wrapper to go narrower; here you drop Container to go wider. The
band owns its content width from the inside (internal padding or an inner `container
mx-auto`); a `rounded-* overflow-hidden` card clips its gradient/background image to
the radius.

### Shared opinionated shells vs `ui/` primitives

When the same layout with a decorative background repeats across pages, extract a
top-level shell (`src/components/*.astro`) instead of re-pasting the markup. A shell
is an opinionated scaffold (fixed structure + slot), **not** a `ui/` primitive: the
shell owns what's identical (decorative background, fixed structure), the consumer
keeps what's page-specific (content, transition names, layout hooks) in the slot or
its own outer wrapper. This is the named-slot half of the primitives split above —
reach for a shell precisely when the structure is fixed and shared, for a compound
`ui/` primitive when the caller must own the structure.

### Brand/social icons — not in `@lucide/astro`

`@lucide/astro` ships no brand/social glyphs (LinkedIn, X, …). Inline the raw
`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">` path verbatim —
never substitute a generic fallback icon — and put the accessible label on the
enclosing link (`aria-label`), not on the `aria-hidden` glyph. Each network needs its
own path; don't share one placeholder across networks. Host it in a
`<Button as="a" variant="soft" size="icon-*">` slot rather than a hand-built `<a>`.

### Presentational shells — content or backend still pending

A section can ship its final layout before its backend or real copy exists. Make the
placeholder unmistakably inert instead of faking a working control:

- An uncabled form uses `type="button"` (never `type="submit"`) so it cannot post.
- A purely decorative image (e.g. a wordmark echoing adjacent text) takes `alt=""`
  so AT skips it.
- Leave a comment pointing at the milestone/decision that will wire the shell up, so
  it isn't mistaken for finished work.

### Pinning content in unequal-height columns

In a multi-column band whose columns hold different amounts of content, make each
column a `flex flex-col` and push its trailing block (e.g. a legal/copyright row)
down with `lg:mt-auto` (add `lg:pt-*` for a minimum gap). Trailing blocks then align
across columns regardless of body height above them. Gate at `lg:` so the stacked
mobile columns keep their natural flow.

### Accessible disclosure (expandable cards)

Vanilla, no framework. Use `aria-expanded` (this is a disclosure), NOT
`aria-pressed` (that's a toggle-button state). When several may be open at once,
each toggle is its own tab stop — no roving tabindex.

- **Don't wrap a semantic card in a `<button>`.** A button flattens its subtree
  (descendants go presentational), so an inner `<h3>`, role and text lose their
  semantics — the heading vanishes from the rotor, and with an `aria-label` on the
  button the descendant text is never announced. The card looks right and is silent
  to AT.
- **Fix — stretched transparent button.** Keep the card a semantic container
  (`<article>` + a real `<h3>` + body) and overlay a transparent
  `<button class="absolute inset-0 …">` for the full-card hit area. The content stays
  exposed to AT; the button carries `aria-expanded`, `aria-controls` (pointing at the
  `id`'d expandable region) and an `sr-only` label. Because the button IS the card's
  box, its focus ring draws the card outline — same "whole card is clickable" UX
  without the flattening.
- **Drive visuals off a data flag.** A `data-active` (or similar) attribute on the
  container drives the open/closed visuals via `group-data-*` variants; a click flips
  it and the toggle's `aria-expanded` in lockstep.
- **Contrast on filled open states.** Text landing on a saturated filled surface must
  use the full-opacity foreground token — a reduced-alpha (`/80`) foreground over a
  saturated fill drops under the 4.5:1 AA floor.
- **`min-h-0` when clipping a flex child.** A flex item defaults to `min-height:auto`
  and refuses to shrink below its content; `min-h-0` is mandatory on any flex child
  that must clip via `overflow-hidden` (e.g. a fixed-height detail window).
- **No-JS baseline.** The pre-script state must be substantive: ship sections open,
  or make the collapsed state itself a complete summary rather than a truncated
  teaser, so nothing essential needs the toggle. Behavior binds through the same
  sibling `*-behavior.ts` + `createMotionBinding` lifecycle as the stateful
  primitives (bind-once, torn down on the view-transition swap). This is essential
  interaction — do NOT gate it on reduced-motion.
