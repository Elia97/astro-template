import { z } from 'astro/zod'

// Primitives shared across schemas. Types are always inferred, never hand-written.
//
// [HARD] Content schemas are strict. A plain `z.object` STRIPS unknown keys, so
// a typo'd or renamed field would vanish from the page with a green build — the
// one content failure the fail-loud loaders can't catch. Anyone editing YAML by
// hand, or a CMS writing a slightly different key, produces exactly that.

// [HARD] Absolute URLs are protocol-allowlisted, and a site-relative path may
// not start with `//`. `URL.canParse` alone accepts `javascript:` and `data:`,
// and `//evil.example` reads as relative while being protocol-relative — both
// reach an `href` unescaped. Harmless while a developer writes the YAML by
// hand; an XSS and an off-site redirect the day a CMS or a client edits it.
const CTA_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:']

function isAllowedCtaUrl(value: string): boolean {
  if (value.startsWith('#')) return true
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return true
  return URL.canParse(value) && CTA_PROTOCOLS.includes(new URL(value).protocol)
}

// CTA: label + url.
export const ctaSchema = z.strictObject({
  label: z.string().min(1),
  url: z.string().min(1).refine(isAllowedCtaUrl, {
    message: 'url must be a relative path (/…), an anchor (#…) or an http(s)/mailto/tel URL',
  }),
})
export type Cta = z.infer<typeof ctaSchema>
