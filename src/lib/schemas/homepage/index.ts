import { z } from 'astro/zod'

import { heroSectionSchema } from './hero'

// Homepage as a singleton split into sections: discriminated union on the
// `section` field. INJECTION POINT for `pnpm gen:section` (ts-morph): new
// sections register here (import + entry in the union) — the generator
// asserts on this function and the z.discriminatedUnion call.
export function homepageCollectionSchema() {
  return z.discriminatedUnion('section', [heroSectionSchema()])
}
