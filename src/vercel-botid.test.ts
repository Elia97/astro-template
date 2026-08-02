import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the BotID proxy wiring in vercel.json. The client challenge is served
// from these same-origin paths — that is what keeps ad-blockers and the CSP out
// of the way, and why enabling BotID needs no `script-src` entry. A typo in the
// opaque prefix disables the bot check and leaves every action POST waiting on a
// 404, and `astro dev` never reads vercel.json, so CI is the only place any of
// it can be exercised. The prefix is Vercel's, not ours: it must stay
// byte-for-byte what /docs/botid/get-started publishes.

type Rewrite = { source: string; destination: string }
type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderEntry[] }
type VercelConfig = { rewrites: Rewrite[]; headers: HeaderRule[] }

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

const BOTID_PREFIX = '/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3'

describe('vercel.json BotID proxy', () => {
  it('serves the challenge script same-origin', () => {
    const challenge = config.rewrites.find((rule) => rule.source.endsWith('/c.js'))
    expect(challenge?.source).toBe(`${BOTID_PREFIX}/a-4-a/c.js`)
    expect(challenge?.destination).toBe('https://api.vercel.com/bot-protection/v1/challenge')
  })

  it('proxies every other BotID path', () => {
    const proxy = config.rewrites.find((rule) => rule.source === `${BOTID_PREFIX}/:path*`)
    expect(proxy?.destination).toBe('https://api.vercel.com/bot-protection/v1/proxy/:path*')
  })

  it('relaxes X-Frame-Options to SAMEORIGIN on the proxy path, after the global DENY', () => {
    const index = config.headers.findIndex((rule) => rule.source === `${BOTID_PREFIX}/:path*`)
    expect(config.headers[index]?.headers).toEqual([{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }])
    // Last matching rule wins: placed before the global rule it would never apply.
    expect(index).toBeGreaterThan(config.headers.findIndex((rule) => rule.source === '/(.*)'))
  })
})
