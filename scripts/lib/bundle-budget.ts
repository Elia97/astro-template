export type Chunk = { gzip: number; static: Set<string>; dynamic: Set<string> }

export type Budget = { label: string; matches: (route: string) => boolean; maxGzip: number }

export type PageFile = { file: string; source: string }

export type Expectations = {
  exact: { route: string; file: string }[]
  patterns: { pattern: RegExp; label: string; file: string }[]
  ssr: string[]
}

// 20 KB is ~2× the heaviest measured starter route (/contatti, ~10 KB gz).
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

/** Rollup quotes static specifiers with `"` and dynamic ones with a template literal. */
export function parseEdges(source: string): Pick<Chunk, 'static' | 'dynamic'> {
  return {
    static: captured(source, /(?:from|import)\s*(["'`])\.\/([^"'`]+\.js)\1/g, 2),
    dynamic: captured(source, /import\(\s*(["'`])\.\/([^"'`]+\.js)\1\s*\)/g, 2),
  }
}

export function htmlEntries(html: string): string[] {
  return [...captured(html, /(?:src|href)="\/_astro\/([^"]+\.js)"/g, 1)]
}

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

export function deferredClosure(reached: Set<string>, chunks: Map<string, Chunk>): Set<string> {
  /* v8 ignore next -- every reached name came out of the same chunk map */
  const entries = [...reached].flatMap((name) => [...(chunks.get(name)?.dynamic ?? [])])
  return new Set([...staticClosure(entries, chunks)].filter((name) => !reached.has(name)))
}

const toPosix = (path: string, prefix: string): string => path.slice(prefix.length).split(/[\\/]/).join('/')

export const CSS_BUDGET_GZIP = 12 * 1024

export type Stylesheet = { file: string; gzip: number }

export function heaviestStylesheet(sheets: readonly Stylesheet[]): Stylesheet | null {
  return sheets.reduce<Stylesheet | null>((worst, sheet) => (worst && worst.gzip >= sheet.gzip ? worst : sheet), null)
}

// Astro emits one stylesheet per page group and a route links exactly one of them, so their
// sum is bytes no visitor ever downloads together.
export function cssBudgetFailure(sheets: readonly Stylesheet[]): string | null {
  const heaviest = heaviestStylesheet(sheets)
  if (heaviest === null || heaviest.gzip <= CSS_BUDGET_GZIP) return null
  const over = heaviest.gzip - CSS_BUDGET_GZIP
  return `CSS ${(heaviest.gzip / 1024).toFixed(1)} KB gz > ${(CSS_BUDGET_GZIP / 1024).toFixed(1)} KB (+${(over / 1024).toFixed(1)} KB) in ${heaviest.file}`
}

export function routeOf(htmlPath: string, dist: string): string {
  const route = toPosix(htmlPath, dist).replace(/\/index\.html$/, '')
  return route.replace(/\.html$/, '') || '/'
}

const SSR_OPT_OUT = /^\s*export\s+const\s+prerender\s*=\s*false\b/m

function pageRouteOf(file: string, pagesDir: string): string {
  return (
    toPosix(file, pagesDir)
      .replace(/\.astro$/, '')
      .replace(/\/index$/, '') || '/'
  )
}

function segmentPattern(segment: string): string {
  if (segment.startsWith('[')) return '[^/]+'
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TRAILING_REST_SEGMENT = /\/\[\.\.\.[^/]*\]$/

// A trailing rest segment also matches nothing: `paginate()` emits page one as the bare
// path (`/news`, never `/news/1`), so requiring a segment fails a one-page archive.
function routePattern(route: string): RegExp {
  const body = (path: string) => path.split('/').map(segmentPattern).join('/')
  if (!TRAILING_REST_SEGMENT.test(route)) return new RegExp(`^${body(route)}$`)
  return new RegExp(`^${body(route.replace(TRAILING_REST_SEGMENT, ''))}(?:/.*)?$`)
}

/** Only `.astro` pages: an endpoint like `robots.txt.ts` prerenders too but emits no HTML. */
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
    expectations.patterns.push({ pattern: routePattern(route), label: route, file })
  }
  return expectations
}

/** [HARD] Fail-open guard: every per-route assertion iterates the emitted pages, so an empty dist asserts nothing. */
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
