import { i18n } from 'astro:config/client'
import { type CollectionEntry, getCollection } from 'astro:content'

// Homepage data-access layer. SSoT chain:
// Zod schema → CollectionEntry<'homepage'>['data'] → HomepageSections → Props.
type Section = CollectionEntry<'homepage'>['data']
type SectionId = Section['section']
type SectionData<S extends SectionId> = Extract<Section, { section: S }>

export type HomepageSections = { [S in SectionId]: SectionData<S> }

const DEFAULT_LOCALE = i18n?.defaultLocale ?? 'it'

/**
 * Loads the homepage sections for a locale (defaults to the primary one).
 * Default-locale entries live flat (`hero.yml` → id "hero"); other locales
 * live in a subfolder (`en/hero.yml` → id "en/hero") — adding a locale later
 * is purely additive, never a restructure.
 */
export async function getHomepageSections(
  locale?: string,
): Promise<HomepageSections> {
  const resolved = locale ?? DEFAULT_LOCALE
  const isDefault = resolved === DEFAULT_LOCALE
  const entries = await getCollection('homepage')

  // Default-locale content must be flat; a `<defaultLocale>/` folder would be
  // loaded, validated and then silently shadowed by the flat copy.
  const misplaced = entries.find((entry) =>
    entry.id.startsWith(`${DEFAULT_LOCALE}/`),
  )
  if (misplaced) {
    throw new Error(
      `Default-locale homepage content must live flat in src/content/homepage/ — ` +
        `move "${misplaced.id}" out of the "${DEFAULT_LOCALE}/" folder`,
    )
  }

  const bySection = new Map<SectionId, Section>()
  const sourceIds = new Map<SectionId, string>()
  for (const entry of entries) {
    const inLocale = isDefault
      ? !entry.id.includes('/')
      : entry.id.startsWith(`${resolved}/`)
    if (!inLocale) continue
    // Two files declaring the same section would silently last-win with an
    // arbitrary (alphabetical) winner — the inverse of the fail-loud contract.
    const existing = sourceIds.get(entry.data.section)
    if (existing) {
      throw new Error(
        `Duplicate homepage section "${entry.data.section}" for locale "${resolved}": ` +
          `"${existing}" and "${entry.id}"`,
      )
    }
    sourceIds.set(entry.data.section, entry.id)
    bySection.set(entry.data.section, entry.data)
  }

  // pick() throws if a file is missing: forgotten file = build error, not a
  // runtime crash on a live page.
  const pick = <S extends SectionId>(section: S): SectionData<S> => {
    const data = bySection.get(section)
    if (!data) {
      const where = isDefault
        ? 'src/content/homepage/'
        : `src/content/homepage/${resolved}/`
      throw new Error(`Homepage section "${section}" not found in ${where}`)
    }
    return data as SectionData<S>
  }

  // INJECTION POINT for `pnpm gen:section` (ts-morph): new sections add their
  // pick() here — the generator asserts on this return object literal.
  return {
    hero: pick('hero'),
  }
}
