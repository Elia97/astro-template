import type { CollectionEntry } from 'astro:content'

import { loadLocalizedSections } from '@/lib/localized-sections'

// SSoT chain: Zod schema → CollectionEntry<'homepage'>['data'] → HomepageSections → Props.
type Section = CollectionEntry<'homepage'>['data']
type SectionId = Section['section']
type SectionData<S extends SectionId> = Extract<Section, { section: S }>

export type HomepageSections = { [S in SectionId]: SectionData<S> }

/** Loads the homepage sections for a locale (defaults to the primary one). */
export async function getHomepageSections(locale?: string): Promise<HomepageSections> {
  const { pick } = await loadLocalizedSections('homepage', locale)

  // INJECTION POINT for `pnpm gen:section` (ts-morph): new sections add their
  // pick() here — the generator asserts on this return object literal.
  return {
    hero: pick('hero'),
  }
}
