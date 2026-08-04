import { actionsFor, addActions, promptNamed, registerWith } from '@test/helpers/fake-plop'
import { describe, expect, it } from 'vitest'

import componentGenerator from './component.mjs'
import pageGenerator from './page.mjs'

const page = () => registerWith(pageGenerator, 'page')
const component = () => registerWith(componentGenerator, 'component')

const validate = (which: 'page' | 'component', prompt: string, value: string) => {
  const { config } = which === 'page' ? page() : component()
  return promptNamed(config, prompt).validate?.(value)
}

describe('gen:page path handling', () => {
  it.each([
    ['about-us', 'about-us.astro'],
    ['legal/privacy', 'legal/privacy.astro'],
    ['  spaced  ', 'spaced.astro'],
  ])('dash-cases each segment of %s independently', (name, expected) => {
    const [add] = addActions(actionsFor(page().config, { name, dynamic: false }))

    expect(add?.path).toBe(`src/pages/${expected}`)
  })

  it('puts a dynamic route in its own folder with the [slug] template', () => {
    const [add] = addActions(actionsFor(page().config, { name: 'blog', dynamic: true }))

    expect(add?.path).toBe('src/pages/blog/[slug].astro')
    expect(add?.templateFile).toContain('dynamic.astro.hbs')
  })

  it('titles the page from its LAST segment, not the whole path', () => {
    const answers = { name: 'legal/cookie-policy', dynamic: false }

    actionsFor(page().config, answers)

    expect(answers).toMatchObject({ pagePath: 'legal/cookie-policy', pageTitle: 'Cookie policy' })
  })

  // change-case strips punctuation, so raw input that looks non-empty can
  // dash-case to nothing — validating the RAW value would let it through and
  // the generator would write src/pages/.astro.
  it.each(['...', '   ', '/'])('rejects %s, which dash-cases to nothing', (value) => {
    expect(validate('page', 'name', value)).toBe('Page path must contain at least one letter or digit')
  })

  it('accepts a real path', () => {
    expect(validate('page', 'name', 'about-us')).toBe(true)
  })
})

describe('gen:component guards', () => {
  // The template emits `export const {{camelCase name}}Variants`, so a name
  // starting with a digit leaves unparseable code on disk.
  it('rejects a name whose camel form is not a valid identifier', () => {
    expect(validate('component', 'name', '404-page')).toMatch(/invalid identifier \(404PageVariants\)/)
  })

  it('rejects an empty name', () => {
    expect(validate('component', 'name', '...')).toBe('Component name is required')
  })

  it('accepts a normal component name', () => {
    expect(validate('component', 'name', 'PriceCard')).toBe(true)
  })

  // Guards the bypass path: `plop component X ''` skips the prompt default, and
  // an unvalidated '' would drop the file straight into src/components/.
  it('rejects an area that dash-cases to nothing', () => {
    expect(validate('component', 'area', '...')).toMatch(/at least one letter or digit/)
  })

  it('accepts a real area folder', () => {
    expect(validate('component', 'area', 'marketing')).toBe(true)
  })

  // plop expands the handlebars itself; what is asserted is that BOTH segments
  // go through dashCase, so 'Marketing Pages' cannot become a folder with a space.
  it('dash-cases both the area and the name in its path template', () => {
    const [add] = addActions(actionsFor(component().config, { name: 'PriceCard', area: 'Marketing Pages' }))

    expect(add?.path).toBe('src/components/{{dashCase area}}/{{dashCase name}}.astro')
  })
})
