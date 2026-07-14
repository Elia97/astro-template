import { getCollection } from 'astro:content'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadLocalizedSections } from '@/lib/localized-sections'

vi.mock('astro:content')

// Shaped like real collection entries; the loader only reads entry.id and
// entry.data.section / entry.data, so the extra fields are free-form.
type Fixture = { id: string; data: { section: string; [key: string]: unknown } }

function mockEntries(entries: Fixture[]): void {
  vi.mocked(getCollection).mockResolvedValue(entries as never)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('loadLocalizedSections — default locale (flat entries)', () => {
  it('indexes flat entries and pick() returns the section data', async () => {
    mockEntries([{ id: 'hero', data: { section: 'hero', headline: 'Welcome' } }])
    const { pick } = await loadLocalizedSections('homepage')
    expect(pick('hero')).toEqual({ section: 'hero', headline: 'Welcome' })
  })

  it('throws when a requested section has no content file', async () => {
    mockEntries([])
    const { pick } = await loadLocalizedSections('homepage')
    expect(() => pick('hero')).toThrow(/not found/)
  })
})

describe('loadLocalizedSections — fail-loud contract', () => {
  it('rejects when a default-locale entry sits in the <defaultLocale>/ folder', async () => {
    mockEntries([{ id: 'it/hero', data: { section: 'hero' } }])
    await expect(loadLocalizedSections('homepage')).rejects.toThrow(/must live flat/)
  })

  it('rejects on a duplicate section within the same locale', async () => {
    mockEntries([
      { id: 'hero', data: { section: 'hero' } },
      { id: 'hero-copy', data: { section: 'hero' } },
    ])
    await expect(loadLocalizedSections('homepage')).rejects.toThrow(/Duplicate/)
  })
})

describe('loadLocalizedSections — non-default locale', () => {
  it('picks only <locale>/ entries and ignores the flat default ones', async () => {
    mockEntries([
      { id: 'hero', data: { section: 'hero', headline: 'Italiano' } },
      { id: 'en/hero', data: { section: 'hero', headline: 'English' } },
    ])
    const { pick } = await loadLocalizedSections('homepage', 'en')
    expect(pick('hero')).toEqual({ section: 'hero', headline: 'English' })
  })
})
