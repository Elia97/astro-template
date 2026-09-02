#!/usr/bin/env node
// Does the live GTM container fire on the events this site emits? Reads the container's
// public gtm.js — no credentials, nothing written.

import { readFileSync } from 'node:fs'

import { coverageOf, extractLinkEvents } from './lib/analytics-coverage.ts'
import { extractTriggers, googleTagIds, parseContainerData } from './lib/gtm-container.ts'

const LINK_TRACKING = 'src/lib/analytics/link-tracking.ts'
const TIMEOUT_MS = 15_000

const gtmId = process.argv[2] ?? process.env.PUBLIC_GTM_ID ?? ''
if (!/^GTM-[A-Z0-9]+$/.test(gtmId)) {
  console.log('No GTM container to check: pass one as an argument or set PUBLIC_GTM_ID.')
  process.exit(0)
}

const response = await fetch(`https://www.googletagmanager.com/gtm.js?id=${gtmId}`, {
  signal: AbortSignal.timeout(TIMEOUT_MS),
})
if (!response.ok) {
  console.error(`✗ container ${gtmId} unreadable: HTTP ${response.status}`)
  process.exit(1)
}

const container = parseContainerData(await response.text())
const triggers = extractTriggers(container)
const coverage = coverageOf(extractLinkEvents(readFileSync(LINK_TRACKING, 'utf8')), triggers)

console.log(`\nGTM ${gtmId} — measurement IDs: ${googleTagIds(container).join(', ') || '—'}\n`)
for (const { event, prefix, covered } of coverage) {
  console.log(`  ${covered ? '✓' : '✗'} ${event.padEnd(16)} (${prefix})`)
}

const missing = coverage.filter(({ covered }) => !covered)
if (missing.length > 0) {
  console.error(`\n✗ ${missing.length} event(s) the site pushes and no trigger listens for.`)
  process.exit(1)
}
console.log('\n✓ Every event the site pushes has a trigger.')
