#!/usr/bin/env node
// Bundle budget gate over dist/client — run after `astro build`. The pure logic
// lives in ./lib/bundle-budget.ts, which is what the unit tests exercise.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import {
  budgetFor,
  deferredClosure,
  expectedRoutes,
  htmlEntries,
  missingRouteFailures,
  parseEdges,
  routeOf,
  staticClosure,
} from './lib/bundle-budget.ts'

const DIST = 'dist/client'
const ASSETS = join(DIST, '_astro')
const PAGES = 'src/pages'

const gz = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

function walk(dir, extension) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path, extension)
    return entry.name.endsWith(extension) ? [path] : []
  })
}

function readChunks() {
  const chunks = new Map()
  for (const name of readdirSync(ASSETS).filter((f) => f.endsWith('.js'))) {
    const raw = readFileSync(join(ASSETS, name))
    chunks.set(name, { gzip: gzipSync(raw).length, ...parseEdges(raw.toString('utf8')) })
  }
  return chunks
}

const chunks = readChunks()
const pages = walk(DIST, '.html')
  .map((htmlPath) => {
    const route = routeOf(htmlPath, DIST)
    const reached = staticClosure(htmlEntries(readFileSync(htmlPath, 'utf8')), chunks)
    const total = (names) => [...names].reduce((sum, name) => sum + chunks.get(name).gzip, 0)
    return {
      route,
      gzip: total(reached),
      deferredGzip: total(deferredClosure(reached, chunks)),
      budget: budgetFor(route),
    }
  })
  .sort((a, b) => b.gzip - a.gzip)

const expected = expectedRoutes(
  walk(PAGES, '.astro').map((file) => ({ file, source: readFileSync(file, 'utf8') })),
  PAGES,
)

const failures = missingRouteFailures(
  expected,
  pages.map((page) => page.route),
  DIST,
)

for (const page of pages) {
  if (page.gzip > page.budget.maxGzip) {
    const over = page.gzip - page.budget.maxGzip
    failures.push(`${page.route}: ${gz(page.gzip)} > ${gz(page.budget.maxGzip)} (+${gz(over)})`)
  }
}

const width = Math.max('ROUTE'.length, ...pages.map((p) => p.route.length))
console.log('\nBundle budget — client JS per route (gzip, static closure)\n')
console.log(`${'ROUTE'.padEnd(width)}   ${'STATIC'.padStart(9)}   ${'BUDGET'.padStart(9)}   ${'DEFERRED'.padStart(9)}`)
for (const page of pages) {
  const deferred = page.deferredGzip > 0 ? gz(page.deferredGzip) : '—'
  const line = `${page.route.padEnd(width)}   ${gz(page.gzip).padStart(9)}   ${gz(page.budget.maxGzip).padStart(9)}   ${deferred.padStart(9)}`
  console.log(page.gzip > page.budget.maxGzip ? `${line}  ✗` : line)
}
console.log('\nDEFERRED = reachable only through `await import()` (loaded after paint, behind a runtime guard).')

// Not a failure: an SSR page emits no HTML, so it is outside this budget by
// construction — `output: 'server'` makes that the default for a new page.
if (expected.ssr.length > 0) {
  console.log(
    `\nNOTE  ${expected.ssr.length} page(s) are SSR and outside this budget (no \`export const prerender = true\`):`,
  )
  for (const file of expected.ssr) console.log(`      - ${file}`)
}

if (failures.length > 0) {
  console.error(`\n✗ Bundle budget:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`)
  process.exit(1)
}
console.log('\n✓ Bundle budget respected on every expected route.\n')
