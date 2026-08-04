import { renderToFragment } from '@test/container'
import { describe, expect, it } from 'vitest'

import Hero from './hero.astro'

const props = {
  section: 'hero',
  title: 'Titolo',
  buttons: [],
} as const

describe('hero.astro', () => {
  it('renders the title as the page h1, since the hero owns it', async () => {
    const document = await renderToFragment(Hero, { props })

    expect(document.querySelector('h1')?.textContent?.trim()).toBe('Titolo')
  })

  it.each([
    ['eyebrow', 'Novità'],
    ['subtitle', 'Sottotitolo'],
  ])('renders the optional %s when the content provides it', async (field, value) => {
    const document = await renderToFragment(Hero, { props: { ...props, [field]: value } })

    expect(document.body.textContent).toContain(value)
  })

  // Both are `.optional()` in the schema: an entry that omits them must render
  // the hero anyway, not an empty tag or a crash.
  it('omits them entirely when the content does not', async () => {
    const document = await renderToFragment(Hero, { props })

    expect(document.querySelectorAll('p')).toHaveLength(0)
  })
})

describe('the hero buttons', () => {
  it('renders no button container when the content declares none', async () => {
    const document = await renderToFragment(Hero, { props })

    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  // The design invariant behind the `index === 0` check: the FIRST cta is the
  // primary action and the rest are secondary. Swap them and the page asks for
  // two things with equal weight.
  it('styles only the first cta as the primary action', async () => {
    const buttons = [
      { label: 'Contattaci', url: '/contatti' },
      { label: 'Scopri', url: '/servizi' },
    ]

    const document = await renderToFragment(Hero, { props: { ...props, buttons } })

    const [primary, secondary] = [...document.querySelectorAll('a')]
    expect(primary?.getAttribute('href')).toBe('/contatti')
    expect(primary?.getAttribute('class')).not.toBe(secondary?.getAttribute('class'))
  })
})
