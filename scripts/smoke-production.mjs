#!/usr/bin/env node
// Runtime smoke test against the live production host. The `deploy` job in
// .github/workflows/release-please.yml runs it right after `vercel deploy --prod`
// and fails on it; run it by hand (`pnpm smoke:prod [url]`) after a rollback.
//
// This is the runtime half of what src/vercel-*.test.ts checks declaratively:
// those pin what vercel.json SAYS, this one is the only place that sees what the
// edge actually serves.

import process from 'node:process'

import { SITE } from '../src/lib/site.ts'

// The apex, not the *.vercel.app URL `vercel deploy` prints: on that host
// `X-Robots-Tag: noindex` is there by construction (the `has: host` rule in
// vercel.json), so the check below would report the opposite of the truth.
const baseUrl = (process.argv[2] ?? SITE.url).replace(/\/+$/, '')

if (process.argv[2] === undefined && new URL(SITE.url).host === 'example.com') {
  console.error('\n✗ SITE.url is still the template placeholder — pass a URL: pnpm smoke:prod https://…\n')
  process.exit(1)
}

const PAGES = [
  { path: '/', type: 'text/html' },
  // Prerendered like every other page, but past the home: covers a route served
  // off the CDN from a nested path rather than the root.
  { path: '/contatti', type: 'text/html' },
  { path: '/robots.txt', type: 'text/plain' },
  { path: '/sitemap-index.xml', type: 'xml' },
]

// Declared on the global `/(.*)` rule in vercel.json. `null` = presence is the
// assertion — src/vercel-headers.test.ts already pins the values, and repeating
// a long CSP here would mean editing two places for one change.
const SECURITY_HEADERS = {
  'content-security-policy': null,
  'strict-transport-security': null,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': null,
  'permissions-policy': null,
}

// Same-origin proxy for the BotID challenge. The declarative test pins the
// rewrite; only a live request shows whether the edge honours it.
const BOTID_CHALLENGE = '/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js'

const failures = []

const pass = (check) => console.log(`✓ ${check}`)

const fail = (check, detail) => {
  failures.push(`${check} — ${detail}`)
  console.error(`✗ ${check} — ${detail}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const get = (url) => fetch(url, { redirect: 'manual' })

/** The production alias takes a moment to point at the deployment just uploaded:
 *  without this wait the smoke would photograph the previous one, or a 404. Only
 *  the first request waits — once the alias resolves everything else is served by
 *  the same deployment, and retrying a genuine failure five times just makes a
 *  red job slower. Failures here are not reported: the checks below do that. */
async function waitForAlias(attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if ((await get(baseUrl)).ok) return
    } catch {
      // Network-level failure — the checks below report it with its message.
    }
    if (attempt < attempts) await sleep(attempt * 2000)
  }
}

async function checkPages() {
  for (const { path, type } of PAGES) {
    const check = `GET ${path}`
    try {
      const response = await get(`${baseUrl}${path}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (response.status !== 200) fail(check, `expected 200, got ${response.status}`)
      else if (!contentType.includes(type)) fail(check, `expected a ${type} content-type, got "${contentType}"`)
      else pass(check)
    } catch (error) {
      fail(check, error.message)
    }
  }
}

async function checkSecurityHeaders() {
  let response
  try {
    response = await get(baseUrl)
  } catch (error) {
    fail('security headers', error.message)
    return
  }

  for (const [header, expected] of Object.entries(SECURITY_HEADERS)) {
    const check = `header ${header}`
    const value = response.headers.get(header)
    if (value === null) fail(check, 'missing')
    else if (expected !== null && value !== expected) fail(check, `expected "${expected}", got "${value}"`)
    else pass(check)
  }

  // The `has: host = *.vercel.app` rule must never reach the custom domain: a
  // noindex here drops the live site out of every search index.
  const check = 'no x-robots-tag on the production host'
  const robots = response.headers.get('x-robots-tag')
  if (robots === null) pass(check)
  else fail(check, `present on ${baseUrl}: "${robots}"`)
}

async function checkBotIdChallenge() {
  const check = 'BotID challenge proxied same-origin'
  try {
    const response = await get(`${baseUrl}${BOTID_CHALLENGE}`)
    if (response.status !== 200) fail(check, `expected 200 from the rewrite, got ${response.status}`)
    else pass(check)
  } catch (error) {
    fail(check, error.message)
  }
}

/** The www → apex 308 from vercel.json. The one check that can't run against an
 *  arbitrary base URL: it depends on DNS and on the domain configured on the
 *  Vercel project, not on the deployment under test. */
async function checkCanonicalHost() {
  const check = 'www → apex 308'
  if (baseUrl !== SITE.url) {
    console.log(`- ${check} (skipped: base URL is not ${SITE.url})`)
    return
  }
  try {
    const response = await get(`https://www.${new URL(SITE.url).host}/`)
    const location = response.headers.get('location') ?? ''
    if (response.status !== 308) fail(check, `expected 308, got ${response.status}`)
    else if (!location.startsWith(SITE.url)) fail(check, `location "${location}" does not point at ${SITE.url}`)
    else pass(check)
  } catch (error) {
    fail(check, error.message)
  }
}

console.log(`\nProduction smoke — ${baseUrl}\n`)

await waitForAlias()
await checkPages()
await checkSecurityHeaders()
await checkBotIdChallenge()
await checkCanonicalHost()

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} check(s) failed:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`)
  console.error('Production is live and broken. Roll back from the Vercel dashboard:')
  console.error('Deployments → the last known-good production deployment → Promote to Production.\n')
  process.exit(1)
}
console.log(`\n✓ Every check passed on ${baseUrl}.\n`)
