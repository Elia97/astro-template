import { i18n } from 'astro:config/client'
import { type CollectionEntry, getCollection } from 'astro:content'

type Sectioned = 'homepage'

/* v8 ignore next -- astro:config/client is injected by Astro on every render; the fallback guards a module that cannot be missing */
const DEFAULT_LOCALE = i18n?.defaultLocale ?? 'it'

export async function loadLocalizedSections<C extends Sectioned>(
  collection: C,
  locale?: string,
): Promise<{
  pick: <S extends CollectionEntry<C>['data']['section']>(
    section: S,
  ) => Extract<CollectionEntry<C>['data'], { section: S }>
}> {
  type Data = CollectionEntry<C>['data']
  type SectionId = Data['section']

  const resolved = locale ?? DEFAULT_LOCALE
  const isDefault = resolved === DEFAULT_LOCALE
  const entries = await getCollection(collection)

  const misplaced = entries.find((entry) => entry.id.startsWith(`${DEFAULT_LOCALE}/`))
  if (misplaced) {
    throw new Error(
      `Default-locale ${collection} content must live flat in src/content/${collection}/ — ` +
        `move "${misplaced.id}" out of the "${DEFAULT_LOCALE}/" folder`,
    )
  }

  const bySection = new Map<SectionId, Data>()
  const sourceIds = new Map<SectionId, string>()
  for (const entry of entries) {
    const inLocale = isDefault ? !entry.id.includes('/') : entry.id.startsWith(`${resolved}/`)
    if (!inLocale) continue
    const existing = sourceIds.get(entry.data.section)
    if (existing) {
      throw new Error(
        `Duplicate ${collection} section "${entry.data.section}" for locale "${resolved}": ` +
          `"${existing}" and "${entry.id}"`,
      )
    }
    sourceIds.set(entry.data.section, entry.id)
    bySection.set(entry.data.section, entry.data)
  }

  const pick = <S extends SectionId>(section: S): Extract<Data, { section: S }> => {
    const data = bySection.get(section)
    if (!data) {
      const where = isDefault ? `src/content/${collection}/` : `src/content/${collection}/${resolved}/`
      throw new Error(`${collection} section "${section}" not found in ${where}`)
    }
    return data as Extract<Data, { section: S }>
  }

  return { pick }
}
