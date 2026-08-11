import { z } from 'astro/zod'

import { heroSectionSchema } from './hero'

// INJECTION POINT for `pnpm gen:section` (ts-morph): the generator asserts on this
// function and its z.discriminatedUnion call.
export function homepageCollectionSchema() {
  return z.discriminatedUnion('section', [heroSectionSchema()])
}
