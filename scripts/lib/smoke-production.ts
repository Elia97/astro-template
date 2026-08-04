// Data in, data out: the network, the printing and the exit code stay in
// scripts/smoke-production.mjs, so every check here is unit-testable.

/** The slice of `Response` the checks read — a test supplies a literal. */
export interface SmokeResponse {
  ok: boolean
  status: number
  headers: { get: (name: string) => string | null }
}

export type Fetcher = (url: string) => Promise<SmokeResponse>

export interface SmokeContext {
  get: Fetcher
  /** The host under test, already stripped of trailing slashes. */
  baseUrl: string
  /** SITE.url — what the canonical-host check compares the base against. */
  siteUrl: string
}

export interface CheckResult {
  check: string
  status: 'pass' | 'fail' | 'skip'
  detail?: string
}

const pass = (check: string): CheckResult => ({ check, status: 'pass' })
const fail = (check: string, detail: string): CheckResult => ({ check, status: 'fail', detail })
const skip = (check: string, detail: string): CheckResult => ({ check, status: 'skip', detail })

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const PAGES = [
  { path: '/', type: 'text/html' },
  // Not the root: a prerendered route served off the CDN from a nested path.
  { path: '/contatti', type: 'text/html' },
  { path: '/robots.txt', type: 'text/plain' },
  { path: '/sitemap-index.xml', type: 'xml' },
] as const

// Declared on the global `/(.*)` rule in vercel.json. `null` = presence is the
// assertion — src/vercel-headers.test.ts already pins the values, and repeating
// a long CSP here would mean editing two places for one change.
export const SECURITY_HEADERS: Record<string, string | null> = {
  'content-security-policy': null,
  'strict-transport-security': null,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': null,
  'permissions-policy': null,
}

/** Same-origin proxy for the BotID challenge. */
export const BOTID_CHALLENGE = '/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js'

/**
 * The production alias takes a moment to point at the deployment just uploaded:
 * without this wait the smoke would photograph the previous one, or a 404. Only
 * the first request waits — once the alias resolves everything else is served by
 * the same deployment, and retrying a genuine failure five times just makes a
 * red job slower. Failures here are not reported: the checks below do that.
 */
export async function waitForAlias(
  { get, baseUrl }: SmokeContext,
  sleep: (ms: number) => Promise<void>,
  attempts = 5,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if ((await get(baseUrl)).ok) return
    } catch {
      // Network-level failure — the checks below report it with its message.
    }
    if (attempt < attempts) await sleep(attempt * 2000)
  }
}

export async function checkPages({ get, baseUrl }: SmokeContext): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  for (const { path, type } of PAGES) {
    const check = `GET ${path}`
    try {
      const response = await get(`${baseUrl}${path}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (response.status !== 200) results.push(fail(check, `expected 200, got ${response.status}`))
      else if (!contentType.includes(type))
        results.push(fail(check, `expected a ${type} content-type, got "${contentType}"`))
      else results.push(pass(check))
    } catch (error) {
      results.push(fail(check, messageOf(error)))
    }
  }
  return results
}

export async function checkSecurityHeaders({ get, baseUrl }: SmokeContext): Promise<CheckResult[]> {
  let response: SmokeResponse
  try {
    response = await get(baseUrl)
  } catch (error) {
    return [fail('security headers', messageOf(error))]
  }

  const results = Object.entries(SECURITY_HEADERS).map(([header, expected]) => {
    const check = `header ${header}`
    const value = response.headers.get(header)
    if (value === null) return fail(check, 'missing')
    if (expected !== null && value !== expected) return fail(check, `expected "${expected}", got "${value}"`)
    return pass(check)
  })

  // The `has: host = *.vercel.app` rule must never reach the custom domain: a
  // noindex here drops the live site out of every search index.
  const check = 'no x-robots-tag on the production host'
  const robots = response.headers.get('x-robots-tag')
  results.push(robots === null ? pass(check) : fail(check, `present on ${baseUrl}: "${robots}"`))
  return results
}

export async function checkBotIdChallenge({ get, baseUrl }: SmokeContext): Promise<CheckResult[]> {
  const check = 'BotID challenge proxied same-origin'
  try {
    const response = await get(`${baseUrl}${BOTID_CHALLENGE}`)
    if (response.status !== 200) return [fail(check, `expected 200 from the rewrite, got ${response.status}`)]
    return [pass(check)]
  } catch (error) {
    return [fail(check, messageOf(error))]
  }
}

/**
 * The www → apex 308 from vercel.json. The one check that can't run against an
 * arbitrary base URL: it depends on DNS and on the domain configured on the
 * Vercel project, not on the deployment under test.
 */
export async function checkCanonicalHost({ get, baseUrl, siteUrl }: SmokeContext): Promise<CheckResult[]> {
  const check = 'www → apex 308'
  if (baseUrl !== siteUrl) return [skip(check, `base URL is not ${siteUrl}`)]
  try {
    const response = await get(`https://www.${new URL(siteUrl).host}/`)
    const location = response.headers.get('location') ?? ''
    if (response.status !== 308) return [fail(check, `expected 308, got ${response.status}`)]
    if (!location.startsWith(siteUrl)) return [fail(check, `location "${location}" does not point at ${siteUrl}`)]
    return [pass(check)]
  } catch (error) {
    return [fail(check, messageOf(error))]
  }
}

/** Every check, in order. The caller prints and decides the exit code. */
export async function runChecks(context: SmokeContext): Promise<CheckResult[]> {
  return [
    ...(await checkPages(context)),
    ...(await checkSecurityHeaders(context)),
    ...(await checkBotIdChallenge(context)),
    ...(await checkCanonicalHost(context)),
  ]
}
