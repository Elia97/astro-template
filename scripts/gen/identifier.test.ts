import { describe, expect, it } from 'vitest'

import { isValidIdentifier } from './identifier.mjs'

// The guard runs on the plop prompt, BEFORE any file is written. What it stops
// is a name that produces `const new = defineCollection(…)` or
// `export const 2fa = …` — output that parses nowhere and that the generator
// would leave on disk half-injected.
describe('isValidIdentifier', () => {
  it.each(['hero', 'blogPost', '_private', '$dollar', 'a1', 'Await'])('accepts %s', (name) => {
    expect(isValidIdentifier(name)).toBe(true)
  })

  // camelCase('new feature') is `new` — a reserved word reachable from an
  // ordinary-looking section name, which is why the check is not just the regex.
  it.each(['new', 'class', 'return', 'typeof', 'enum', 'await'])('rejects the reserved word %s', (name) => {
    expect(isValidIdentifier(name)).toBe(false)
  })

  it.each([
    ['', 'empty'],
    ['2fa', 'leading digit'],
    ['my-section', 'a dash'],
    ['città', 'non-ASCII letters'],
    ['a b', 'a space'],
  ])('rejects %s (%s)', (name) => {
    expect(isValidIdentifier(name)).toBe(false)
  })
})
