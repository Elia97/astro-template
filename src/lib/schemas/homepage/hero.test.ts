import { describe, expect, it } from 'vitest'

import { homepageCollectionSchema } from '@/lib/schemas/homepage'
import { heroSectionSchema } from '@/lib/schemas/homepage/hero'

const hero = {
  section: 'hero',
  title: 'Titolo',
  buttons: [{ label: 'Azione', url: '/contatti' }],
}

describe('heroSectionSchema', () => {
  it('accepts a well-formed section', () => {
    expect(heroSectionSchema().safeParse(hero).success).toBe(true)
  })

  // The regression this guards: with a non-strict object the typo is dropped and
  // the page renders without the field, build green.
  it('rejects an unknown key instead of stripping it', () => {
    const result = heroSectionSchema().safeParse({ ...hero, subtitile: 'typo' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown key inside a nested cta', () => {
    const result = heroSectionSchema().safeParse({
      ...hero,
      buttons: [{ label: 'Azione', url: '/contatti', target: '_blank' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('homepageCollectionSchema', () => {
  it('carries the strictness through the discriminated union', () => {
    expect(homepageCollectionSchema().safeParse(hero).success).toBe(true)
    expect(homepageCollectionSchema().safeParse({ ...hero, subtitile: 'typo' }).success).toBe(false)
  })
})
