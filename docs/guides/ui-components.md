# UI components

Conventions established by the base scaffold (design tokens, layout chrome).
Cross-ref: `rendering-performance.md` (motion/reveal lifecycle), `seo.md` (head contract).

## Design tokens — three tiers, one rebrand surface

- `src/styles/tokens.css` — raw oklch primitives + `--radius`. **This is the only
  file to touch when rebranding a fork.** Token names follow the Tailwind scale
  step they hold (`--neutral-700` = Tailwind's neutral-700 value; a mislabeled
  step is a bug, not a taste choice).
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

- Theme = `.dark` class on `<html>`, toggled by `src/components/theme-script.astro`
  (inline anti-FOUC in `<head>`, delegated `[data-theme-toggle]` click handler,
  re-applied on `astro:after-swap`).
- Both themes declare `color-scheme` so native UI (form controls, scrollbars)
  follows the theme.
- Toggle buttons carry `aria-pressed`, synced by the theme script — new toggles
  only need the `data-theme-toggle` attribute plus an initial `aria-pressed="false"`.

## Chrome content

Header/footer/skip-link structure comes from `src/lib/site.ts` (`SITE`): nav,
CTA, legal links, socials. Copy is NOT there — entries carry i18n dictionary
keys resolved via `useTranslations(Astro.currentLocale)`
(`src/i18n/strings/<locale>.ts`). No hardcoded labels in components; internal
links go through `localizedHref()` so they localize with the site
(HOW_TO_USE.md → "Adding a locale").

## Tailwind v4 idioms adopted (don't regress to v3 habits)

- `focus-visible:outline-hidden`, not `outline-none` — rings are box-shadows and
  disappear in forced-colors mode; `outline-hidden` keeps a transparent outline
  that Windows High Contrast repaints.
- Logical properties for the inline axis (`start-4`, `ms-*`) — the template is
  i18n-ready and must survive an RTL locale.
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
- `<html>` carries `scroll-pt-20` so anchor jumps clear the 64px sticky header.
- Icon glyphs are `aria-hidden` with the label on the control; text-presentation
  variation selector (`&#xFE0E;`) on codepoints WebKit would render as emoji.
- Overlay building blocks (for menus/dialogs a fork adds): `lib/trap-focus.ts`
  (`cycleFocus` — call from the container's keydown, Tab wraps at both ends)
  and `lib/scroll-lock.ts` (reference-counted `lockScroll`/`unlockScroll`;
  `resetScrollLock()` on `astro:after-swap` so locks never leak across view
  transitions). `.focus-ring` utility for custom focusables outside the
  ring-based form controls.

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
- Layout lives in two primitives, never hand-written: `Container` (Tailwind's
  `container` utility — breakpoint-snapped width so every section aligns
  vertically; auto centering + responsive gutter are added once via
  `@utility container` in globals.css) and `Section` (vertical rhythm,
  `spacing` none/compact/default/spacious, semantic `<section>`). Page sections
  compose `<Section><Container>…</Container></Section>`; generator templates
  must emit this shape. Rare narrower blocks nest an inner
  `mx-auto max-w-*` wrapper inside Container instead of changing its width.
- Button sizes are one t-shirt scale, `sm/md/lg/xl` plus square `icon-*`
  twins (`md` is the default — no `default` size key; variant names DO keep
  shadcn's `default`). Beyond the shadcn set: `variant="soft"` is a low-emphasis
  filled control (semantic tokens only, NO baked text color — an icon/social glyph
  inherits `currentColor`), and a `shape` axis (`default`/`pill`) swaps only the box
  radius (`pill` = `rounded-full`).
- Form fields compose the `Field` compound (`ui/field/`: `Field` +
  `FieldLabel` + `FieldContent`, vertical/horizontal orientation) around the
  flat controls (`input.astro`, `textarea.astro`, `select.astro`).
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

No React in the base scaffold. If a fork needs a genuinely stateful component
(Dialog, Calendar, …), see the islands gotchas in `ARCHITECTURE.md`.

## Page-section layout patterns

Patterns for opinionated page sections (heroes, banners, footers, feature grids),
reusable across pages — distinct from the unopinionated `ui/` primitives above.

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
`<Button as="a" variant="soft" size="icon-*">` slot rather than a hand-built `<a>`:
`soft` carries no text color, so the glyph inherits `currentColor`.

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

Recipe for an expandable card — or a grid of them — that toggles a collapsed summary
against expanded detail, vanilla and no framework. Use `aria-expanded` (this is a
disclosure), NOT `aria-pressed` (that's a toggle-button state). When several may be
open at once, each toggle is its own tab stop — no roving tabindex.

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
