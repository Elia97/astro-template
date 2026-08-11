import { always, context, response, secureHeaders, statuses } from '@test/helpers/smoke-fetch'
import { describe, expect, it, vi } from 'vitest'

import { checkPages, checkSecurityHeaders, type Fetcher, PAGES, waitForAlias } from './smoke-production'

const contentTypeFor = (url: string) =>
  url.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8'

describe('waitForAlias', () => {
  it('stops at the first ok response, so a healthy alias costs one request', async () => {
    const get = vi.fn(always({ ok: true }))
    const sleep = vi.fn(() => Promise.resolve())

    await waitForAlias(context(get), sleep)

    expect(get).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('backs off between attempts and gives up without reporting anything', async () => {
    const get = vi.fn(always({ ok: false }))
    const sleep = vi.fn(() => Promise.resolve())

    await expect(waitForAlias(context(get), sleep, 3)).resolves.toBeUndefined()

    expect(get).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[2000], [4000]])
  })

  it('swallows a network error, because the checks report it with its message', async () => {
    const get = vi.fn(() => Promise.reject(new Error('ENOTFOUND')))

    await expect(waitForAlias(context(get), () => Promise.resolve(), 2)).resolves.toBeUndefined()

    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('checkPages', () => {
  it('passes every declared page when the status and content-type line up', async () => {
    const get: Fetcher = (url) =>
      Promise.resolve(
        response({ headers: { 'content-type': url.endsWith('.xml') ? 'application/xml' : contentTypeFor(url) } }),
      )

    expect(statuses(await checkPages(context(get)))).toEqual(PAGES.map(() => 'pass'))
  })

  it.each([
    [{ status: 404, headers: { 'content-type': 'text/html' } }, /expected 200, got 404/],
    [{ headers: { 'content-type': 'application/json' } }, /expected a text\/html content-type/],
    [{ headers: {} }, /got ""/],
  ])('fails the root page on %o', async (init, detail) => {
    const [root] = await checkPages(context(always(init)))

    expect(root?.status).toBe('fail')
    expect(root?.detail).toMatch(detail)
  })

  it('reports a network error as the failure detail', async () => {
    const [root] = await checkPages(context(() => Promise.reject(new Error('ECONNREFUSED'))))

    expect(root).toMatchObject({ status: 'fail', detail: 'ECONNREFUSED' })
  })

  it('stringifies a thrown non-Error', async () => {
    const [root] = await checkPages(context(() => Promise.reject('socket hang up')))

    expect(root?.detail).toBe('socket hang up')
  })
})

describe('checkSecurityHeaders', () => {
  it('passes when every header is present and the pinned values match', async () => {
    const results = await checkSecurityHeaders(context(always({ headers: secureHeaders() })))

    expect(statuses(results)).toEqual(results.map(() => 'pass'))
  })

  it('fails a missing header', async () => {
    const headers = secureHeaders()
    delete headers['referrer-policy']

    const results = await checkSecurityHeaders(context(always({ headers })))

    expect(results).toContainEqual({ check: 'header referrer-policy', status: 'fail', detail: 'missing' })
  })

  it('fails a pinned header whose value drifted', async () => {
    const headers = { ...secureHeaders(), 'x-frame-options': 'SAMEORIGIN' }

    const results = await checkSecurityHeaders(context(always({ headers })))

    expect(results).toContainEqual(
      expect.objectContaining({ check: 'header x-frame-options', detail: 'expected "DENY", got "SAMEORIGIN"' }),
    )
  })

  it('fails when x-robots-tag reached the production host', async () => {
    const headers = { ...secureHeaders(), 'x-robots-tag': 'noindex' }

    const results = await checkSecurityHeaders(context(always({ headers })))

    expect(results.at(-1)).toMatchObject({ status: 'fail', detail: expect.stringContaining('noindex') })
  })

  it('reports one failure, not six, when the request itself fails', async () => {
    const results = await checkSecurityHeaders(context(() => Promise.reject(new Error('ETIMEDOUT'))))

    expect(results).toEqual([{ check: 'security headers', status: 'fail', detail: 'ETIMEDOUT' }])
  })
})
