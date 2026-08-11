import { actionsFor, addActions, type FunctionAction, promptNamed, registerWith } from '@test/helpers/fake-plop'
import { cleanupRoots, makeRoot, read } from '@test/helpers/gen-fixture'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import collectionGenerator from './collection.mjs'
import sectionGenerator from './section.mjs'

// collection.mjs and section.mjs capture `process.cwd()` at registration, so the chdir has to precede it.
let original: string

beforeEach(() => {
  original = process.cwd()
  process.chdir(makeRoot())
})

afterEach(() => {
  process.chdir(original)
  cleanupRoots()
})

const run = (action: unknown, answers: Record<string, string | boolean>, plop: unknown) =>
  (action as FunctionAction)(answers, null, plop as never)

/** The three function actions in order: pre-flight, injection, post-gen — never invoked, it shells out to `astro sync`. */
const steps = (actions: unknown[]) => {
  const functions = actions.filter((action) => typeof action === 'function')
  expect(functions).toHaveLength(3)
  expect(actions.indexOf(functions[0])).toBe(0)
  return { preflight: functions[0], inject: functions[1] }
}

describe('gen:collection wiring', () => {
  it('runs the content.config.ts pre-flight before any file is written', () => {
    const { plop, config } = registerWith(collectionGenerator, 'collection')
    const { preflight } = steps(actionsFor(config, { name: 'services', document: false }))

    expect(run(preflight, { name: 'services' }, plop)).toMatch(/contract checks passed/)
  })

  it('injects only after the schema and the example entry exist', () => {
    const { plop, config } = registerWith(collectionGenerator, 'collection')
    const { inject } = steps(actionsFor(config, { name: 'services', document: false }))

    expect(run(inject, { name: 'services', document: false }, plop)).toMatch(/injected collection/)
    expect(read(process.cwd(), 'src/content.config.ts')).toContain('const services = defineCollection({')
  })

  it.each([
    [true, 'src/content/{{dashCase name}}/example.md', 'doc.md.hbs'],
    [false, 'src/content/{{dashCase name}}/example.yml', 'data.yml.hbs'],
  ])('picks the content file for document=%s', (document, path, template) => {
    const { config } = registerWith(collectionGenerator, 'collection')

    const [, entry] = addActions(actionsFor(config, { name: 'services', document }))

    expect(entry?.path).toBe(path)
    expect(entry?.templateFile).toContain(template)
  })

  it('rejects a name whose camel form would be an invalid const', () => {
    const { config } = registerWith(collectionGenerator, 'collection')

    expect(promptNamed(config, 'name').validate?.('2fa')).toMatch(/invalid identifier \(const 2fa\)/)
    expect(promptNamed(config, 'name').validate?.('...')).toBe('Collection name is required')
    expect(promptNamed(config, 'name').validate?.('services')).toBe(true)
  })
})

describe('gen:section wiring', () => {
  it('runs the hook-point pre-flight before any file is written', () => {
    const { plop, config } = registerWith(sectionGenerator, 'section')
    const { preflight } = steps(actionsFor(config, { name: 'features' }))

    expect(run(preflight, { name: 'features' }, plop)).toMatch(/contract checks passed/)
  })

  it('injects the union entry, the pick and the component, reporting the pascal name', () => {
    const { plop, config } = registerWith(sectionGenerator, 'section')
    const { inject } = steps(actionsFor(config, { name: 'features' }))

    expect(run(inject, { name: 'features' }, plop)).toContain('Features')
    expect(read(process.cwd(), 'src/lib/homepage.ts')).toContain("features: pick('features')")
  })

  it('writes the schema, the content and the component under the same dash-cased name', () => {
    const { config } = registerWith(sectionGenerator, 'section')

    expect(addActions(actionsFor(config, { name: 'features' })).map((action) => action.path)).toEqual([
      'src/lib/schemas/homepage/{{dashCase name}}.ts',
      'src/content/homepage/{{dashCase name}}.yml',
      'src/components/home/{{dashCase name}}.astro',
    ])
  })

  it('rejects a name whose camel form would be an invalid schema identifier', () => {
    const { config } = registerWith(sectionGenerator, 'section')

    expect(promptNamed(config, 'name').validate?.('2fa')).toMatch(/invalid identifier \(2faSectionSchema\)/)
    expect(promptNamed(config, 'name').validate?.('...')).toBe('Section name is required')
    expect(promptNamed(config, 'name').validate?.('features')).toBe(true)
  })
})
