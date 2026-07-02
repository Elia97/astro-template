import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

import { homepageCollectionSchema } from '@/lib/schemas/homepage'

// DATA shape: one .yml per section → only entry.data, no renderable body.
// The homepage is a singleton split into sections, one entry per file.
// Default-locale content is FLAT (src/content/homepage/hero.yml); additional
// locales go in a subfolder (src/content/homepage/<locale>/hero.yml).
const homepage = defineCollection({
  loader: glob({
    pattern: '**/*.{yaml,yml}',
    base: './src/content/homepage',
    // Raw relative path minus extension. The default generateId would break
    // the locale filter in lib/homepage.ts three ways: it slugifies segments
    // (en-US → en-us), honors a top-level `slug` key in the YAML verbatim
    // (before zod strips it), and strips a trailing /index.
    generateId: ({ entry }) => entry.replace(/\.(yaml|yml)$/, ''),
  }),
  schema: homepageCollectionSchema,
})

// INJECTION POINT for `pnpm gen:collection` (ts-morph): new collections
// register in this object literal — the generator asserts on it.
export const collections = {
  homepage,
}
