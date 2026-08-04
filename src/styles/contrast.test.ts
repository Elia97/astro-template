import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The contract docs/guides/ui-components.md § Contrast asks for, made executable.
// It reads the CSS rather than restating the values, so a rebrand that drops a
// token below the threshold fails here instead of at a client's accessibility
// audit — the failure has no other symptom, since nothing renders wrong.
//
// Ratios are computed the WCAG 2.x way: oklch → Oklab → LMS → linear sRGB →
// relative luminance. Not the `Y = L³` shortcut, which only holds at chroma 0
// and would quietly misreport every red.

type Oklch = readonly [l: number, c: number, h: number]

function readStyles(file: string): string {
  return readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
}

function primitives(): Record<string, Oklch> {
  const found: Record<string, Oklch> = {}
  for (const [, name, l, c, h] of readStyles('tokens.css').matchAll(
    /--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,
  )) {
    found[String(name)] = [Number(l), Number(c), Number(h)]
  }
  return found
}

function roles(css: string, palette: Record<string, Oklch>): Record<string, Oklch> {
  const found: Record<string, Oklch> = {}
  for (const [, role, primitive] of css.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)/g)) {
    const value = palette[String(primitive)]
    if (value) found[String(role)] = value
  }
  return found
}

function luminance([l, c, hDeg]: Oklch): number {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ] as const
  const [long, medium, short] = lms
  const rgb = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map((channel) => Math.min(1, Math.max(0, channel)))
  return 0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0)
}

function ratio(a: Oklch, b: Oklch): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

const palette = primitives()
const light = roles(readStyles('light.css'), palette)
// Dark only overrides part of the set; everything else inherits :root.
const dark = { ...light, ...roles(readStyles('dark.css'), palette) }
const themes = [
  ['light', light],
  ['dark', dark],
] as const

// WCAG 1.4.3, normal text.
const TEXT_PAIRS = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['surface-foreground', 'surface'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  // Both roles of the same token: the form error is `text-destructive`, the
  // button is `bg-destructive` with `--destructive-foreground` on top.
  ['destructive', 'background'],
  ['destructive', 'card'],
  ['destructive-foreground', 'destructive'],
] as const

// WCAG 1.4.11, boundaries of a UI component.
const UI_PAIRS = [
  ['input', 'background'],
  // The contact form sits inside a Card, which is the tighter of the two.
  ['input', 'card'],
  ['ring', 'background'],
  ['ring', 'card'],
] as const

describe.each(themes)('%s theme', (_name, tokens) => {
  it.each(TEXT_PAIRS)('%s on %s clears 4.5:1', (fg, bg) => {
    const pair = [tokens[fg], tokens[bg]] as const
    expect(pair[0], `--${fg} is not mapped`).toBeDefined()
    expect(pair[1], `--${bg} is not mapped`).toBeDefined()
    expect(ratio(pair[0] as Oklch, pair[1] as Oklch)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('%s on %s clears 3:1', (fg, bg) => {
    const pair = [tokens[fg], tokens[bg]] as const
    expect(ratio(pair[0] as Oklch, pair[1] as Oklch)).toBeGreaterThanOrEqual(3)
  })
})
