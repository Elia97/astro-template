#!/usr/bin/env node
// Runtime smoke against the live production host — the only check that sees
// what the edge actually serves, where src/vercel-*.test.ts only pins what
// vercel.json says. Run it by hand after a rollback: `pnpm smoke:prod [url]`.
//
// The checks live in ./lib/smoke-production.ts, which is what the unit tests
// exercise; everything here is the network, the printing and the exit code.

import process from 'node:process'

import { SITE } from '../src/lib/site.ts'
import { runChecks, waitForAlias } from './lib/smoke-production.ts'

// The apex, not the *.vercel.app URL `vercel deploy` prints: on that host
// `X-Robots-Tag: noindex` is there by construction (the `has: host` rule in
// vercel.json), so the check below would report the opposite of the truth.
const baseUrl = (process.argv[2] ?? SITE.url).replace(/\/+$/, '')

if (process.argv[2] === undefined && new URL(SITE.url).host === 'example.com') {
  console.error('\n✗ SITE.url is still the template placeholder — pass a URL: pnpm smoke:prod https://…\n')
  process.exit(1)
}

const context = {
  get: (url) => fetch(url, { redirect: 'manual' }),
  baseUrl,
  siteUrl: SITE.url,
}

console.log(`\nProduction smoke — ${baseUrl}\n`)

await waitForAlias(context, (ms) => new Promise((resolve) => setTimeout(resolve, ms)))
const results = await runChecks(context)

for (const { check, status, detail } of results) {
  if (status === 'pass') console.log(`✓ ${check}`)
  else if (status === 'skip') console.log(`- ${check} (skipped: ${detail})`)
  else console.error(`✗ ${check} — ${detail}`)
}

const failures = results.filter(({ status }) => status === 'fail')
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} check(s) failed:`)
  console.error(`${failures.map(({ check, detail }) => `  - ${check} — ${detail}`).join('\n')}\n`)
  console.error('Production is live and broken. Roll back from the Vercel dashboard:')
  console.error('Deployments → the last known-good production deployment → Promote to Production.\n')
  process.exit(1)
}
console.log(`\n✓ Every check passed on ${baseUrl}.\n`)
