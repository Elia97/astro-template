import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the preview-deploy noindex in vercel.json. A page opting into
// `prerender = true` is served as a static file and never reaches
// src/middleware.ts, so the noindex has to come from an edge header rule — and
// `astro dev` never reads vercel.json, which leaves CI as the only place the
// rule can be exercised at all. It must match the deployment's *.vercel.app
// hosts (preview AND the production aliases, which would otherwise duplicate
// the custom domain) and never the custom domain itself.

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

  // Behaviour, not spelling: Vercel anchors route patterns against the whole
  // host, so the assertions run the configured pattern the way the edge does.
  it('matches vercel.app deployment hosts, never the production domain', () => {
    const pattern = hostRule?.has?.find((cond) => cond.type === 'host')?.value
    expect(pattern).toBeDefined()
    const host = new RegExp(`^(?:${pattern ?? ''})$`)

    expect(host.test('my-project-git-feat-thing-acme.vercel.app')).toBe(true)
    expect(host.test('my-project.vercel.app')).toBe(true)

    // SITE.url's host — still the template placeholder, replaced per fork.
    expect(host.test('example.com')).toBe(false)
    expect(host.test('www.example.com')).toBe(false)
    // A host merely *containing* the pattern must not slip through the anchors.
    expect(host.test('vercel.app.example.com')).toBe(false)
  })

  // The failure that matters most: a rule that also covered the custom domain
  // would drop the live site out of every search index.
  it('leaves the unconditional rule free of X-Robots-Tag', () => {
    expect(globalRule).toBeDefined()
    expect(robotsTag(globalRule)).toBeUndefined()
  })
})
