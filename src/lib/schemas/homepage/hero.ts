import { z } from 'astro/zod'

import { ctaSchema } from '../common'

// Hero section: the one section universal to (almost) every marketing/lead-gen
// site. Generic, neutral fields. Add more sections with `pnpm gen:section`.
export function heroSectionSchema() {
  return z.object({
    section: z.literal('hero'), // union discriminant
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    buttons: z.array(ctaSchema).max(2).default([]),
  })
}

export type HeroSection = z.infer<ReturnType<typeof heroSectionSchema>>
