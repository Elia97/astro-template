import { afterEach, describe, expect, it, vi } from 'vitest'

import { sendTransactionalEmail, upsertContact } from '@/lib/vendor/brevo'

const EMAIL_PARAMS = {
  to: [{ email: 'ops@example.test', name: 'Ops' }],
  sender: { email: 'no-reply@example.test', name: 'Sito' },
  subject: 'Subject',
  htmlContent: '<p>hi</p>',
  tags: ['contact'],
}

function okResponse(): Response {
  return new Response(JSON.stringify({ messageId: 'abc' }), { status: 201 })
}

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>

function stubUncalledFetch(): FetchMock {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubResolvedFetch(response: Response): FetchMock {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubRejectedFetch(error: Error): FetchMock {
  const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(error)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sendTransactionalEmail', () => {
  it('no-ops without calling fetch when the API key is unset (dev)', async () => {
    vi.stubEnv('BREVO_API_KEY', '')
    const fetchMock = stubUncalledFetch()

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result).toEqual({ ok: true, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to /smtp/email with the api-key header and serialized body', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    const fetchMock = stubResolvedFetch(okResponse())

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'api-key': 'secret-key' }),
        body: expect.stringContaining('"subject":"Subject"'),
      }),
    )
  })

  it('returns an error result on a non-ok response', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    stubResolvedFetch(new Response('bad sender', { status: 400 }))

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Brevo /smtp/email 400')
      expect(result.error).toContain('bad sender')
    }
  })

  it('returns an error result when fetch rejects', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    stubRejectedFetch(new Error('network down'))

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('request failed')
    }
  })
})

describe('upsertContact', () => {
  it('persists a contact with updateEnabled true', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    const fetchMock = stubResolvedFetch(okResponse())

    const result = await upsertContact({
      email: 'visitor@example.test',
      attributes: { FIRSTNAME: 'Mario' },
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/contacts',
      expect.objectContaining({
        body: expect.stringContaining('"updateEnabled":true'),
      }),
    )
  })
})

// `fetch` waits forever by default. Three of these run in parallel inside the
// action, so an upstream that accepts and stalls would hold the whole function
// open until the platform kills it — no error path, no lead, just a spinner.
describe('request deadline', () => {
  it('aborts the request instead of waiting on the vendor indefinitely', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    const fetchMock = stubResolvedFetch(okResponse())

    await sendTransactionalEmail(EMAIL_PARAMS)

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('reports a timed-out request as a failure, never as a success', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    stubRejectedFetch(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result.ok).toBe(false)
  })
})

describe('production without a key', () => {
  // Dev no-ops loudly; production refusing is the point — a silently dropped
  // lead is the worst outcome, so the missing key has to surface as a failure.
  it('refuses to no-op instead of reporting success', async () => {
    vi.stubEnv('PROD', true)
    const fetchMock = stubUncalledFetch()

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result).toEqual({ ok: false, error: expect.stringContaining('BREVO_API_KEY unset in production') })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('unreadable error bodies', () => {
  it('still reports the status when the body cannot be read', async () => {
    vi.stubEnv('BREVO_API_KEY', 'secret-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error('stream')) }),
    )

    const result = await sendTransactionalEmail(EMAIL_PARAMS)

    expect(result).toEqual({ ok: false, error: expect.stringContaining('500') })
  })
})
