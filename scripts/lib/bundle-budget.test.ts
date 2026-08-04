import { describe, expect, it } from 'vitest'

import {
  budgetFor,
  CSS_BUDGET_GZIP,
  cssBudgetFailure,
  deferredClosure,
  expectedRoutes,
  htmlEntries,
  missingRouteFailures,
  parseEdges,
  routeOf,
  staticClosure,
} from './bundle-budget'

const graph = (edges: Record<string, { static?: string[]; dynamic?: string[] }>) =>
  new Map(
    Object.entries(edges).map(([name, { static: statics, dynamic }]) => [
      name,
      { gzip: 0, static: new Set(statics ?? []), dynamic: new Set(dynamic ?? []) },
    ]),
  )

describe('parseEdges', () => {
  it('reads both quoting forms', () => {
    const edges = parseEdges('import "./a.js";import{x}from`./b.js`;await import("./c.js");import(`./d.js`)')
    expect([...edges.static].sort()).toEqual(['a.js', 'b.js'])
    expect([...edges.dynamic].sort()).toEqual(['c.js', 'd.js'])
  })

  // Getting this backwards would hide a library sitting on the critical path.
  it('does not count a dynamic import as a static edge', () => {
    expect([...parseEdges('await import("./heavy.abc.js")').static]).toEqual([])
  })
})

describe('htmlEntries', () => {
  it('takes the page chunks off src and href, and nothing else', () => {
    const html = '<script src="/_astro/page.js"></script><link href="/_astro/main.js"><link href="/_astro/x.css">'
    expect(htmlEntries(html).sort()).toEqual(['main.js', 'page.js'])
  })
})

describe('staticClosure', () => {
  it('follows static edges transitively and stops at dynamic ones', () => {
    const chunks = graph({ 'a.js': { static: ['b.js'], dynamic: ['z.js'] }, 'b.js': { static: ['c.js'] }, 'c.js': {} })
    expect([...staticClosure(['a.js'], chunks)].sort()).toEqual(['a.js', 'b.js', 'c.js'])
  })

  it('ignores edges into chunks that were not emitted', () => {
    expect([...staticClosure(['a.js'], graph({ 'a.js': { static: ['gone.js'] } }))]).toEqual(['a.js'])
  })

  it('terminates on a cycle', () => {
    const chunks = graph({ 'a.js': { static: ['b.js'] }, 'b.js': { static: ['a.js'] } })
    expect([...staticClosure(['a.js'], chunks)].sort()).toEqual(['a.js', 'b.js'])
  })
})

describe('deferredClosure', () => {
  it('returns what only an `await import()` reaches, with its own static tail', () => {
    const chunks = graph({ 'a.js': { dynamic: ['heavy.js'] }, 'heavy.js': { static: ['maths.js'] }, 'maths.js': {} })
    const deferred = deferredClosure(staticClosure(['a.js'], chunks), chunks)
    expect([...deferred].sort()).toEqual(['heavy.js', 'maths.js'])
  })

  it('excludes anything the static closure already reached', () => {
    const chunks = graph({ 'a.js': { static: ['b.js'], dynamic: ['b.js'] }, 'b.js': {} })
    expect([...deferredClosure(staticClosure(['a.js'], chunks), chunks)]).toEqual([])
  })
})

describe('routeOf', () => {
  it('maps emitted HTML back to its route', () => {
    expect(routeOf('dist/client/index.html', 'dist/client')).toBe('/')
    expect(routeOf('dist/client/contatti/index.html', 'dist/client')).toBe('/contatti')
    expect(routeOf('dist/client/404.html', 'dist/client')).toBe('/404')
  })
})

describe('expectedRoutes', () => {
  const prerendered = '// no annotation: prerendered by default\n'
  const optedOut = 'export const prerender = false\n'

  it('splits pages by prerender, keeping dynamic segments as patterns', () => {
    const expected = expectedRoutes(
      [
        { file: 'src/pages/index.astro', source: prerendered },
        { file: 'src/pages/blog/[slug].astro', source: prerendered },
        { file: 'src/pages/live.astro', source: optedOut },
      ],
      'src/pages',
    )
    expect(expected.exact).toEqual([{ route: '/', file: 'src/pages/index.astro' }])
    expect(expected.ssr).toEqual(['src/pages/live.astro'])
    expect(expected.patterns[0]?.pattern.test('/blog/anything')).toBe(true)
    expect(expected.patterns[0]?.pattern.test('/blog/a/b')).toBe(false)
  })

  // The default is now the measured one, so a miss here is fail-open: prose read
  // as a declaration would drop a real page out of the budget silently.
  it('ignores the word prerender inside prose', () => {
    const source = '// this page is intentionally not prerender = false\n'
    const expected = expectedRoutes([{ file: 'src/pages/x.astro', source }], 'src/pages')
    expect(expected.ssr).toEqual([])
    expect(expected.exact).toEqual([{ route: '/x', file: 'src/pages/x.astro' }])
  })

  it('treats a rest segment as matching any depth', () => {
    const expected = expectedRoutes([{ file: 'src/pages/[...path].astro', source: prerendered }], 'src/pages')
    expect(expected.patterns[0]?.pattern.test('/a/b/c')).toBe(true)
  })
})

describe('missingRouteFailures', () => {
  const expected = expectedRoutes(
    [
      { file: 'src/pages/index.astro', source: '' },
      { file: 'src/pages/blog/[slug].astro', source: '' },
    ],
    'src/pages',
  )

  it('passes when every expected route was emitted', () => {
    expect(missingRouteFailures(expected, ['/', '/blog/hello'], 'dist/client')).toEqual([])
  })

  it('reports a prerendered page that emitted nothing', () => {
    expect(missingRouteFailures(expected, ['/'], 'dist/client')).toEqual([
      expect.stringContaining('missing route /blog/[slug]'),
    ])
  })

  // [HARD] The fail-open case: every other assertion iterates the emitted pages,
  // so an empty dist would otherwise report a green budget having measured nothing.
  it('refuses to pass on an empty dist', () => {
    expect(missingRouteFailures(expected, [], 'dist/client')).toEqual([expect.stringContaining('no .html file')])
  })
})

describe('budgetFor', () => {
  it('falls back to the default budget for any route', () => {
    expect(budgetFor('/anything').label).toBe('default')
    expect(budgetFor('/').maxGzip).toBe(20 * 1024)
  })
})

// The gap this closes: the stylesheet is the heaviest thing the site ships and
// the only render-blocking one, and until now the gate that exists to catch
// weight never looked at it.
describe('cssBudgetFailure', () => {
  it('passes a stylesheet under the budget', () => {
    expect(cssBudgetFailure(CSS_BUDGET_GZIP - 1, ['main.css'])).toBeNull()
  })

  it('passes a stylesheet exactly at the budget', () => {
    expect(cssBudgetFailure(CSS_BUDGET_GZIP, ['main.css'])).toBeNull()
  })

  it('reports the overage and names every file counted', () => {
    const failure = cssBudgetFailure(CSS_BUDGET_GZIP + 2048, ['main.css', 'extra.css'])
    expect(failure).toContain('main.css')
    expect(failure).toContain('extra.css')
    expect(failure).toContain('2 file(s)')
  })
})

describe('budget selection and edges', () => {
  it('lands on the default class for a route no other class matches', () => {
    expect(budgetFor('/nothing-matches-this').label).toBe('default')
  })

  it('ignores a regex match whose capture group is absent', () => {
    // `from './x.js'` with an optional group that does not participate.
    expect(parseEdges("import 'sideeffect'\n").static.size).toBe(0)
  })

  it('treats an unknown chunk as having no dynamic edges', () => {
    const chunks = new Map([['a.js', { gzip: 1, static: new Set<string>(), dynamic: new Set(['ghost.js']) }]])
    expect(deferredClosure(new Set(['a.js']), chunks).has('ghost.js')).toBe(false)
  })
})
