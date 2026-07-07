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
