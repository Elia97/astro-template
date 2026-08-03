import { z } from 'astro/zod'

// Primitives shared across schemas. Types are always inferred, never hand-written.
//
// [HARD] Content schemas are strict. A plain `z.object` STRIPS unknown keys, so
// a typo'd or renamed field would vanish from the page with a green build — the
// one content failure the fail-loud loaders can't catch. Anyone editing YAML by
// hand, or a CMS writing a slightly different key, produces exactly that.

// CTA: label + url. The `.refine` accepts a relative path (/…), an in-page
// anchor (#…) or a valid absolute URL (URL.canParse). Anything else fails at
// build time.
export const ctaSchema = z.strictObject({
  label: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('/') || value.startsWith('#') || URL.canParse(value), {
      message: 'url must be a relative path (/…, #…) or an absolute URL',
    }),
})
export type Cta = z.infer<typeof ctaSchema>
