import { afterEach, describe, expect, it, vi } from 'vitest'

import { sanitizeLegalHtml } from '@/lib/legal/documents'

const POLICY_ID = '7654321'

/** The env is read at module import, so each case stubs, resets and re-imports. */
async function loadWith(id?: string) {
  vi.resetModules()
  if (id !== undefined) vi.stubEnv('PUBLIC_IUBENDA_COOKIE_POLICY_ID', id)
  return (await import('@/lib/legal/documents')).getLegalDoc
}

function mockFetch(response: unknown, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  } as Response)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetModules()
})

// Injected with set:html into a prerendered page, under a CSP that allows
// inline script. Everything executable has to be gone before it gets there.
describe('sanitizeLegalHtml', () => {
  it('strips script and style elements with their contents', () => {
    const html = '<p>ok</p><script>alert(1)</script><style>body{}</style>'
    expect(sanitizeLegalHtml(html)).toBe('<p>ok</p>')
  })

  it('strips embedding elements', () => {
    expect(sanitizeLegalHtml('<iframe src="x"></iframe><object></object><embed>')).toBe('')
  })

  it('strips inline event handlers, whatever the quoting', () => {
    const sanitized = sanitizeLegalHtml(`<a href="#" onclick="x()" onmouseover='y()' onfocus=z()>t</a>`)
    expect(sanitized).toBe('<a href="#">t</a>')
  })

  it('defuses javascript: URLs', () => {
    expect(sanitizeLegalHtml('<a href="javascript:alert(1)">t</a>')).toBe('<a href="#">t</a>')
  })

  // Signed S3 hosts that the CSP doesn't allow — they would render broken.
  it('drops images', () => {
    expect(sanitizeLegalHtml('<p>a</p><img src="https://s3.example/x.png" alt="">')).toBe('<p>a</p>')
  })

  it('leaves ordinary document markup untouched', () => {
    const html = '<h2>Titolo</h2><p>Testo con <strong>enfasi</strong> e <a href="/privacy">link</a>.</p>'
    expect(sanitizeLegalHtml(html)).toBe(html)
  })
})

describe('getLegalDoc — gating', () => {
  it('returns null when no policy id is configured', async () => {
    const getLegalDoc = await loadWith()
    const fetchSpy = mockFetch({})

    expect(await getLegalDoc('privacy')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // [SENSITIVE] is what Vercel hands a prebuilt pull for a Sensitive variable.
  // Fetching it would build a 404 URL out of a placeholder.
  it('refuses a non-numeric id instead of fetching it', async () => {
    const getLegalDoc = await loadWith('[SENSITIVE]')
    const fetchSpy = mockFetch({})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await getLegalDoc('privacy')).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
  })
})

describe('getLegalDoc — fetching', () => {
  it('returns the sanitized document', async () => {
    const getLegalDoc = await loadWith(POLICY_ID)
    mockFetch({ success: true, content: '<p>Informativa</p><script>x()</script>' })

    expect(await getLegalDoc('privacy')).toBe('<p>Informativa</p>')
  })

  it('asks for the cookie-policy document on the cookie kind', async () => {
    const getLegalDoc = await loadWith(POLICY_ID)
    const fetchSpy = mockFetch({ success: true, content: '<p>Cookie</p>' })

    await getLegalDoc('cookie-policy')

    expect(fetchSpy.mock.calls[0]?.[0]).toContain(`/${POLICY_ID}/cookie-policy/no-markup`)
  })

  // Build-time failure: the page still ships, but the log has to say so — a
  // silently degraded compliance page is the outcome worth preventing.
  it('falls back to null and logs when the API fails', async () => {
    const getLegalDoc = await loadWith(POLICY_ID)
    mockFetch({}, false)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await getLegalDoc('privacy')).toBeNull()
    expect(error).toHaveBeenCalled()
  })

  it('falls back to null on an unexpected envelope', async () => {
    const getLegalDoc = await loadWith(POLICY_ID)
    mockFetch({ success: true })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await getLegalDoc('privacy')).toBeNull()
    expect(error).toHaveBeenCalled()
  })
})
