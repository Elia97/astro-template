export interface SmokeResponse {
  ok: boolean
  status: number
  headers: { get: (name: string) => string | null }
}

export type Fetcher = (url: string) => Promise<SmokeResponse>

export interface SmokeContext {
  get: Fetcher
  baseUrl: string
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
  { path: '/contatti', type: 'text/html' },
  { path: '/robots.txt', type: 'text/plain' },
  { path: '/sitemap-index.xml', type: 'xml' },
  { path: '/api/health', type: 'application/json' },
] as const

// From vercel.json's global `/(.*)` rule. `null` = assert presence only; src/vercel-headers.test.ts pins the values.
export const SECURITY_HEADERS: Record<string, string | null> = {
  'content-security-policy': null,
  'strict-transport-security': null,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': null,
  'permissions-policy': null,
}

/** Must match the rewrite `source` in vercel.json. */
export const BOTID_CHALLENGE = '/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js'

/** Vercel's production alias takes a moment to point at the deployment just uploaded. */
export async function waitForAlias(
  { get, baseUrl }: SmokeContext,
  sleep: (ms: number) => Promise<void>,
  attempts = 5,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if ((await get(baseUrl)).ok) return
    } catch {}
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

  // vercel.json's `has: host = *.vercel.app` noindex on the custom domain drops the site out of every search index.
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

/** The www → apex 308 from vercel.json: depends on DNS and the Vercel project's domain, not on the deployment. */
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

export async function checkTrailingSlash({ get, baseUrl }: SmokeContext): Promise<CheckResult[]> {
  const page = PAGES.find(({ path, type }) => type === 'text/html' && path !== '/')
  const check = 'trailing slash → 308'
  /* v8 ignore next -- PAGES always carries an HTML page other than /, but find() types it optional */
  if (page === undefined) return [skip(check, 'no HTML page other than / to probe')]
  try {
    const response = await get(`${baseUrl}${page.path}/`)
    if (response.status !== 308) return [fail(check, `expected 308 on ${page.path}/, got ${response.status}`)]
    const location = response.headers.get('location') ?? ''
    if (!location.endsWith(page.path)) return [fail(check, `location "${location}" does not point at ${page.path}`)]
    return [pass(check)]
  } catch (error) {
    return [fail(check, messageOf(error))]
  }
}

export async function runChecks(context: SmokeContext): Promise<CheckResult[]> {
  return [
    ...(await checkPages(context)),
    ...(await checkSecurityHeaders(context)),
    ...(await checkBotIdChallenge(context)),
    ...(await checkCanonicalHost(context)),
    ...(await checkTrailingSlash(context)),
  ]
}
