import { describe, expect, it } from 'vitest'

import {
  budgetFor,
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
  const prerendered = 'export const prerender = true\n'

  it('splits pages by prerender, keeping dynamic segments as patterns', () => {
    const expected = expectedRoutes(
      [
        { file: 'src/pages/index.astro', source: prerendered },
        { file: 'src/pages/blog/[slug].astro', source: prerendered },
        { file: 'src/pages/live.astro', source: '// no prerender here\n' },
      ],
      'src/pages',
    )
    expect(expected.exact).toEqual([{ route: '/', file: 'src/pages/index.astro' }])
    expect(expected.ssr).toEqual(['src/pages/live.astro'])
    expect(expected.patterns[0]?.pattern.test('/blog/anything')).toBe(true)
    expect(expected.patterns[0]?.pattern.test('/blog/a/b')).toBe(false)
  })

  it('ignores the word prerender inside prose', () => {
    const source = '// this page is intentionally not prerender = true\n'
    expect(expectedRoutes([{ file: 'src/pages/x.astro', source }], 'src/pages').ssr).toEqual(['src/pages/x.astro'])
  })

  it('treats a rest segment as matching any depth', () => {
    const expected = expectedRoutes([{ file: 'src/pages/[...path].astro', source: prerendered }], 'src/pages')
    expect(expected.patterns[0]?.pattern.test('/a/b/c')).toBe(true)
  })
})

describe('missingRouteFailures', () => {
  const expected = expectedRoutes(
    [
      { file: 'src/pages/index.astro', source: 'export const prerender = true\n' },
      { file: 'src/pages/blog/[slug].astro', source: 'export const prerender = true\n' },
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
