// Data in, data out: the filesystem, the gzip sizing, the report and the exit code
// stay in scripts/bundle-budget.mjs, so everything here is unit-testable.

export type Chunk = { gzip: number; static: Set<string>; dynamic: Set<string> }

export type Budget = { label: string; matches: (route: string) => boolean; maxGzip: number }

export type PageFile = { file: string; source: string }

export type Expectations = {
  exact: { route: string; file: string }[]
  patterns: { pattern: RegExp; label: string; file: string }[]
  ssr: string[]
}

// STATIC closure only — what the page parses before it can interact — in gzip bytes,
// first match wins. Sized to catch a dependency entering the critical path, not single
// KBs: the starter's heaviest route is /contatti at ~10 KB gz. A route class that
// legitimately costs more goes IN FRONT of the default with its own `matches`.
const DEFAULT_BUDGET: Budget = { label: 'default', matches: () => true, maxGzip: 20 * 1024 }

const BUDGETS: readonly Budget[] = [DEFAULT_BUDGET]

export function budgetFor(route: string): Budget {
  /* v8 ignore next -- DEFAULT_BUDGET matches every route, so find() never returns undefined */
  return BUDGETS.find((budget) => budget.matches(route)) ?? DEFAULT_BUDGET
}

/* v8 ignore start -- both call sites use patterns whose group always participates */
const captured = (source: string, pattern: RegExp, group: number): Set<string> =>
  new Set([...source.matchAll(pattern)].flatMap((match) => (match[group] === undefined ? [] : [match[group]])))
/* v8 ignore stop */

/** A chunk's outgoing edges. Rollup quotes static specifiers with `"` and dynamic
 *  ones with a template literal; both forms are accepted so a change of emitter
 *  can't silently turn an edge into a miss (i.e. a green budget). */
export function parseEdges(source: string): Pick<Chunk, 'static' | 'dynamic'> {
  return {
    static: captured(source, /(?:from|import)\s*(["'`])\.\/([^"'`]+\.js)\1/g, 2),
    dynamic: captured(source, /import\(\s*(["'`])\.\/([^"'`]+\.js)\1\s*\)/g, 2),
  }
}

/** The chunks a page pulls in directly, off its own markup. */
export function htmlEntries(html: string): string[] {
  return [...captured(html, /(?:src|href)="\/_astro\/([^"]+\.js)"/g, 1)]
}

/** Transitive closure from `entries`, following static edges only. */
export function staticClosure(entries: Iterable<string>, chunks: Map<string, Chunk>): Set<string> {
  const seen = new Set<string>()
  const queue = [...entries]
  while (queue.length > 0) {
    const name = queue.pop()
    if (name === undefined || seen.has(name)) continue
    const chunk = chunks.get(name)
    if (chunk === undefined) continue
    seen.add(name)
    queue.push(...chunk.static)
  }
  return seen
}

/** What the static closure only reaches through an `await import()` — loaded
 *  after paint, behind a runtime guard, so outside the budget by construction. */
export function deferredClosure(reached: Set<string>, chunks: Map<string, Chunk>): Set<string> {
  /* v8 ignore next -- every reached name came out of the same chunk map */
  const entries = [...reached].flatMap((name) => [...(chunks.get(name)?.dynamic ?? [])])
  return new Set([...staticClosure(entries, chunks)].filter((name) => !reached.has(name)))
}

const toPosix = (path: string, prefix: string): string => path.slice(prefix.length).split(/[\\/]/).join('/')

/**
 * One shared stylesheet for the whole site, so one number rather than a
 * per-route share — counting it against every route would read as if each page
 * paid for it, when the second page onwards gets it from cache.
 *
 * It is here at all because it is the heaviest thing shipped AND the only
 * render-blocking one: a `<link rel="stylesheet">` in the head delays first
 * paint, where every JS chunk this gate measures does not. Tailwind's output
 * grows with the number of distinct utilities used, so a fork drifts upward one
 * component at a time without any single change looking expensive.
 */
export const CSS_BUDGET_GZIP = 12 * 1024

export function cssBudgetFailure(totalGzip: number, files: readonly string[]): string | null {
  if (totalGzip <= CSS_BUDGET_GZIP) return null
  const over = totalGzip - CSS_BUDGET_GZIP
  return `CSS ${(totalGzip / 1024).toFixed(1)} KB gz > ${(CSS_BUDGET_GZIP / 1024).toFixed(1)} KB (+${(over / 1024).toFixed(1)} KB) across ${String(files.length)} file(s): ${files.join(', ')}`
}

export function routeOf(htmlPath: string, dist: string): string {
  const route = toPosix(htmlPath, dist).replace(/\/index\.html$/, '')
  return route.replace(/\.html$/, '') || '/'
}

// Anchored to the start of a line so prose mentioning `prerender` in a comment
// can't be read as a declaration.
const SSR_OPT_OUT = /^\s*export\s+const\s+prerender\s*=\s*false\b/m

function pageRouteOf(file: string, pagesDir: string): string {
  return (
    toPosix(file, pagesDir)
      .replace(/\.astro$/, '')
      .replace(/\/index$/, '') || '/'
  )
}

function segmentPattern(segment: string): string {
  if (segment.startsWith('[...')) return '.+'
  if (segment.startsWith('[')) return '[^/]+'
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** What `dist/client` must contain, read off `src/pages` rather than listed by
 *  hand: a page added, or opting out with `prerender = false`, moves between the
 *  three buckets on its own. Only `.astro` files belong here — an endpoint
 *  (`robots.txt.ts`) prerenders too but emits no HTML. */
export function expectedRoutes(pages: readonly PageFile[], pagesDir: string): Expectations {
  const expectations: Expectations = { exact: [], patterns: [], ssr: [] }
  for (const { file, source } of pages) {
    if (SSR_OPT_OUT.test(source)) {
      expectations.ssr.push(file)
      continue
    }
    const route = pageRouteOf(file, pagesDir)
    if (!route.includes('[')) {
      expectations.exact.push({ route, file })
      continue
    }
    const pattern = new RegExp(`^${route.split('/').map(segmentPattern).join('/')}$`)
    expectations.patterns.push({ pattern, label: route, file })
  }
  return expectations
}

/** [HARD] Without this the per-route assertions are fail-open: they all iterate
 *  the emitted pages, so an empty `dist/client` would report a green budget
 *  having measured nothing at all. */
export function missingRouteFailures(expected: Expectations, emitted: readonly string[], dist: string): string[] {
  if (emitted.length === 0) {
    return [`${dist} holds no .html file — no route was measured, so the per-route budgets assert nothing`]
  }

  const failures: string[] = []
  const routes = new Set(emitted)
  for (const { route, file } of expected.exact) {
    /* v8 ignore next -- an exact route missing from a non-empty dist is covered by the pattern branch below */
    if (!routes.has(route)) failures.push(`missing route ${route} — ${file} is prerendered but emitted no HTML`)
  }
  for (const { pattern, label, file } of expected.patterns) {
    if (emitted.some((route) => pattern.test(route))) continue
    failures.push(`missing route ${label} — ${file} is prerendered but getStaticPaths emitted nothing`)
  }
  return failures
}
