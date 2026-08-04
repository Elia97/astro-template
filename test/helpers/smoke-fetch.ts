// Fake fetcher for the scripts/lib/smoke-production.ts checks. `SmokeResponse`
// is a structural type on purpose: a test states the two or three fields a check
// reads instead of constructing a whole Response.
import {
  type Fetcher,
  SECURITY_HEADERS,
  type SmokeContext,
  type SmokeResponse,
} from '../../scripts/lib/smoke-production'

export const SITE_URL = 'https://example.test'

export interface ResponseInit {
  ok?: boolean
  status?: number
  headers?: Record<string, string>
}

export const response = ({ ok = true, status = 200, headers = {} }: ResponseInit): SmokeResponse => ({
  ok,
  status,
  headers: { get: (name) => headers[name] ?? null },
})

/** Answers every URL the same way. */
export const always =
  (init: ResponseInit): Fetcher =>
  () =>
    Promise.resolve(response(init))

export const context = (get: Fetcher, baseUrl = SITE_URL): SmokeContext => ({ get, baseUrl, siteUrl: SITE_URL })

/** Every security header present and correct — the baseline a test perturbs. */
export const secureHeaders = (): Record<string, string> =>
  Object.fromEntries(Object.entries(SECURITY_HEADERS).map(([header, expected]) => [header, expected ?? 'set']))

export const statuses = (results: { status: string }[]): string[] => results.map(({ status }) => status)
