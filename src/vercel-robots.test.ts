import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// A prerendered page is served as a static file and never reaches src/middleware.ts,
// so the preview noindex is an edge rule — and `astro dev` never reads vercel.json.

type HasCondition = { type: string; value?: string }
type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; has?: HasCondition[]; headers: HeaderEntry[] }
type VercelConfig = { headers: HeaderRule[] }

const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../vercel.json', import.meta.url)), 'utf8'),
) as VercelConfig

function robotsTag(rule: HeaderRule | undefined): string | undefined {
  return rule?.headers.find((entry) => entry.key.toLowerCase() === 'x-robots-tag')?.value
}

const hostRule = config.headers.find((rule) => rule.has?.some((cond) => cond.type === 'host'))
const globalRule = config.headers.find((rule) => rule.source === '/(.*)' && !rule.has)

describe('vercel.json preview-deploy noindex', () => {
  it('noindexes every path on the matched hosts', () => {
    expect(hostRule?.source).toBe('/(.*)')
    expect(robotsTag(hostRule)).toContain('noindex')
  })

  // Vercel anchors a route pattern against the whole host — these run it the way the edge does.
  it('matches vercel.app deployment hosts, never the production domain', () => {
    const pattern = hostRule?.has?.find((cond) => cond.type === 'host')?.value
    expect(pattern).toBeDefined()
    const host = new RegExp(`^(?:${pattern ?? ''})$`)

    expect(host.test('my-project-git-feat-thing-acme.vercel.app')).toBe(true)
    expect(host.test('my-project.vercel.app')).toBe(true)

    expect(host.test('example.com')).toBe(false)
    expect(host.test('www.example.com')).toBe(false)
    expect(host.test('vercel.app.example.com')).toBe(false)
  })

  it('leaves the unconditional rule free of X-Robots-Tag', () => {
    expect(globalRule).toBeDefined()
    expect(robotsTag(globalRule)).toBeUndefined()
  })
})
