import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

import { homepageCollectionSchema } from '@/lib/schemas/homepage'

const homepage = defineCollection({
  loader: glob({
    pattern: '**/*.{yaml,yml}',
    base: './src/content/homepage',
    // Astro's default generateId slugifies segments, honours a top-level `slug` key
    // and strips /index — all three break src/lib/content/localized-sections.ts.
    generateId: ({ entry }) => entry.replace(/\.(yaml|yml)$/, ''),
  }),
  schema: homepageCollectionSchema,
})

export const collections = {
  // INJECTION POINT for `pnpm gen:collection` (ts-morph): the generator asserts on
  // this object literal.
  homepage,
}
