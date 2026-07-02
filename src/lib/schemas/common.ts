import { z } from 'astro/zod'

// Primitives shared across schemas. Types are always inferred, never hand-written.

// CTA: label + url. The `.refine` accepts a relative path (/…), an in-page
// anchor (#…) or a valid absolute URL (URL.canParse). Anything else fails at
// build time.
export const ctaSchema = z.object({
  label: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith('/') || value.startsWith('#') || URL.canParse(value),
      {
        message: 'url must be a relative path (/…, #…) or an absolute URL',
      },
    ),
})
export type Cta = z.infer<typeof ctaSchema>
