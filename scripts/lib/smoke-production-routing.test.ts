import { always, context, SITE_URL, secureHeaders, statuses } from '@test/helpers/smoke-fetch'
import { describe, expect, it, vi } from 'vitest'

import {
  BOTID_CHALLENGE,
  checkBotIdChallenge,
  checkCanonicalHost,
  PAGES,
  runChecks,
  SECURITY_HEADERS,
} from './smoke-production'

describe('checkBotIdChallenge', () => {
  it('passes when the same-origin rewrite serves the challenge', async () => {
    const get = vi.fn(always({}))

    expect(statuses(await checkBotIdChallenge(context(get)))).toEqual(['pass'])
    expect(get).toHaveBeenCalledWith(`${SITE_URL}${BOTID_CHALLENGE}`)
  })

  it('fails when the rewrite is not in place', async () => {
    const [result] = await checkBotIdChallenge(context(always({ status: 404 })))

    expect(result?.status).toBe('fail')
    expect(result?.detail).toMatch(/expected 200 from the rewrite/)
  })

  it('reports a network error', async () => {
    const [result] = await checkBotIdChallenge(context(() => Promise.reject(new Error('EAI_AGAIN'))))

    expect(result).toMatchObject({ status: 'fail', detail: 'EAI_AGAIN' })
  })
})

describe('checkCanonicalHost', () => {
  // It depends on DNS and on the domain configured on the Vercel project, not on
  // the deployment under test, so an arbitrary base URL cannot assert it.
  it('skips without making a request when the base URL is not the production site', async () => {
    const get = vi.fn(always({}))

    const [result] = await checkCanonicalHost(context(get, 'https://preview.vercel.app'))

    expect(result).toMatchObject({ status: 'skip' })
    expect(get).not.toHaveBeenCalled()
  })

  it('passes on a 308 whose location points at the apex', async () => {
    const get = vi.fn(always({ status: 308, headers: { location: `${SITE_URL}/` } }))

    expect(statuses(await checkCanonicalHost(context(get)))).toEqual(['pass'])
    expect(get).toHaveBeenCalledWith('https://www.example.test/')
  })

  it.each([
    [{ status: 200, headers: { location: `${SITE_URL}/` } }, /expected 308, got 200/],
    [{ status: 308, headers: { location: 'https://elsewhere.test/' } }, /does not point at/],
    [{ status: 308, headers: {} }, /location ""/],
  ])('fails on %o', async (init, detail) => {
    const [result] = await checkCanonicalHost(context(always(init)))

    expect(result?.status).toBe('fail')
    expect(result?.detail).toMatch(detail)
  })

  it('reports a network error', async () => {
    const [result] = await checkCanonicalHost(context(() => Promise.reject(new Error('DNS failure'))))

    expect(result).toMatchObject({ status: 'fail', detail: 'DNS failure' })
  })
})

describe('runChecks', () => {
  // The order is what the operator reads down after a deploy, and the CLI prints
  // it verbatim — a check silently dropped from the sequence is a check nobody
  // notices is gone.
  it('runs every check, in order', async () => {
    const headers = { ...secureHeaders(), 'content-type': 'text/html' }

    const results = await runChecks(context(always({ headers })))

    expect(results.map(({ check }) => check)).toEqual([
      ...PAGES.map(({ path }) => `GET ${path}`),
      ...Object.keys(SECURITY_HEADERS).map((header) => `header ${header}`),
      'no x-robots-tag on the production host',
      'BotID challenge proxied same-origin',
      'www → apex 308',
    ])
  })
})
