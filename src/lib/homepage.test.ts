import { describe, expect, it, vi } from 'vitest'

import { loadLocalizedSections } from '@/lib/content/localized-sections'
import { getHomepageSections } from '@/lib/homepage'

vi.mock('@/lib/content/localized-sections')

function loaderReturning(pick: (id: string) => unknown): void {
  vi.mocked(loadLocalizedSections).mockResolvedValue({ pick } as never)
}

describe('getHomepageSections', () => {
  it('reads the homepage collection for the requested locale', async () => {
    loaderReturning(() => ({ section: 'hero' }))

    await getHomepageSections('en')

    expect(loadLocalizedSections).toHaveBeenCalledWith('homepage', 'en')
  })

  it('lets the loader default the locale when none is given', async () => {
    loaderReturning(() => ({ section: 'hero' }))

    await getHomepageSections()

    expect(loadLocalizedSections).toHaveBeenCalledWith('homepage', undefined)
  })

  it('picks one entry per registered section', async () => {
    const pick = vi.fn((id: string) => ({ section: id }))
    loaderReturning(pick)

    const sections = await getHomepageSections()

    expect(pick).toHaveBeenCalledWith('hero')
    expect(sections.hero).toEqual({ section: 'hero' })
  })

  it('propagates the loader throw rather than returning a partial page', async () => {
    loaderReturning(() => {
      throw new Error('missing hero.yml')
    })

    await expect(getHomepageSections()).rejects.toThrow('missing hero.yml')
  })
})
