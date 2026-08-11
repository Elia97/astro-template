import { z } from 'astro/zod'

// [HARD] Content schemas are strict: a plain `z.object` STRIPS unknown keys, so a
// typo'd field vanishes from the page with a green build.

// [HARD] `URL.canParse` accepts `javascript:` and `data:`, and `//evil.example` reads
// as relative while leaving the site — both reach an `href` unescaped.
const CTA_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:']

function isAllowedCtaUrl(value: string): boolean {
  if (value.startsWith('#')) return true
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return true
  return URL.canParse(value) && CTA_PROTOCOLS.includes(new URL(value).protocol)
}

export const ctaSchema = z.strictObject({
  label: z.string().min(1),
  url: z.string().min(1).refine(isAllowedCtaUrl, {
    message: 'url must be a relative path (/…), an anchor (#…) or an http(s)/mailto/tel URL',
  }),
})
export type Cta = z.infer<typeof ctaSchema>
