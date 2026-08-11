import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The opaque prefix is Vercel's, byte-for-byte from /docs/botid/get-started: a typo
// disables the bot check silently, and `astro dev` never reads vercel.json.

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
    // Vercel applies the last matching header rule.
    expect(index).toBeGreaterThan(config.headers.findIndex((rule) => rule.source === '/(.*)'))
  })
})
