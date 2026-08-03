import { afterEach, describe, expect, it, vi } from 'vitest'

const GTM = 'GTM-TEST123'
const SITE_ID = '1234567'
const POLICY_ID = '7654321'

/** The env is read at module import, so each case stubs, resets and re-imports. */
async function loadWith(env: Record<string, string>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return (await import('@/lib/analytics/tracking')).getTrackingConfig()
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

// The gate the whole feature hangs on: no config → the layout renders no CMP and
// no tags, which is how the template ships and how dev always runs.
describe('getTrackingConfig — the off state', () => {
  it('is null when nothing is configured', async () => {
    expect(await loadWith({})).toBeNull()
  })

  it('is null with a GTM container but no CMP', async () => {
    expect(await loadWith({ PUBLIC_GTM_ID: GTM })).toBeNull()
  })

  // Tags without a banner is the combination that would actually be unlawful:
  // GTM would set non-essential cookies with nowhere to refuse them.
  it('is null with a CMP but no GTM container', async () => {
    expect(await loadWith({ PUBLIC_IUBENDA_SITE_ID: SITE_ID })).toBeNull()
  })
})

describe('getTrackingConfig — the on state', () => {
  it('returns both ids once they are set', async () => {
    expect(
      await loadWith({
        PUBLIC_GTM_ID: GTM,
        PUBLIC_IUBENDA_SITE_ID: SITE_ID,
        PUBLIC_IUBENDA_COOKIE_POLICY_ID: POLICY_ID,
      }),
    ).toEqual({ gtmId: GTM, iubendaSiteId: SITE_ID, cookiePolicyId: POLICY_ID })
  })

  it('tolerates a missing cookie policy id', async () => {
    const config = await loadWith({ PUBLIC_GTM_ID: GTM, PUBLIC_IUBENDA_SITE_ID: SITE_ID })
    expect(config?.cookiePolicyId).toBe('')
  })
})

// Vercel hands a "Sensitive" variable to a prebuilt pull as the literal string
// "[SENSITIVE]". Without this guard it would be spliced into an iubenda API URL
// and fetched — a 404 at build time, or a CMP configured with a garbage id.
describe('getTrackingConfig — non-numeric ids are treated as unset', () => {
  it('refuses the [SENSITIVE] placeholder as a site id', async () => {
    expect(await loadWith({ PUBLIC_GTM_ID: GTM, PUBLIC_IUBENDA_SITE_ID: '[SENSITIVE]' })).toBeNull()
  })

  it('refuses the [SENSITIVE] placeholder as a policy id', async () => {
    const config = await loadWith({
      PUBLIC_GTM_ID: GTM,
      PUBLIC_IUBENDA_SITE_ID: SITE_ID,
      PUBLIC_IUBENDA_COOKIE_POLICY_ID: '[SENSITIVE]',
    })
    expect(config?.cookiePolicyId).toBe('')
  })

  it('refuses anything else non-numeric', async () => {
    for (const value of ['abc', '123abc', ' 123', '12.3']) {
      expect(await loadWith({ PUBLIC_GTM_ID: GTM, PUBLIC_IUBENDA_SITE_ID: value }), value).toBeNull()
    }
  })
})
