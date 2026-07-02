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

Header/footer/skip-link content comes from `src/lib/site.ts` (`SITE`): nav, CTA,
legal links, UI microcopy (`SITE.strings`). No hardcoded labels in components.

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

## Upcoming (not yet landed)

UI primitives (button, badge, alert, card, input, textarea) will live in
`src/components/ui/` as native `.astro` files using `cva` variants + `cn()`
(`clsx` + `tailwind-merge`) — shadcn's API shape without the React/Radix
runtime. No React in the base scaffold; if a fork needs a genuinely stateful
component, see the islands gotchas in `ARCHITECTURE.md` once documented.
