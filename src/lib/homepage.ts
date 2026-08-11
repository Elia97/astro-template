import type { CollectionEntry } from 'astro:content'

import { loadLocalizedSections } from '@/lib/content/localized-sections'

type Section = CollectionEntry<'homepage'>['data']
type SectionId = Section['section']
type SectionData<S extends SectionId> = Extract<Section, { section: S }>

export type HomepageSections = { [S in SectionId]: SectionData<S> }

export async function getHomepageSections(locale?: string): Promise<HomepageSections> {
  const { pick } = await loadLocalizedSections('homepage', locale)

  // INJECTION POINT for `pnpm gen:section` (ts-morph): new sections add their
  // pick() here — the generator asserts on this return object literal.
  return {
    hero: pick('hero'),
  }
}
