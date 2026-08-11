import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { buildCspContent } from '@/lib/csp/directives'
import { collectInlineScriptHashes, injectCspMeta } from '@/lib/csp/html'

const sha = (s: string) => `sha256-${createHash('sha256').update(s).digest('base64')}`

describe('collectInlineScriptHashes', () => {
  it('hashes executable inline scripts, skips src/json/empty ones', () => {
    const body = "\n  console.log('x')\n"
    const html = `
      <script>${body}</script>
      <script src="/a.js"></script>
      <script type="application/ld+json">{"@type":"x"}</script>
      <script type="application/json">{"k":1}</script>
      <script>   </script>
    `
    expect(collectInlineScriptHashes(html)).toEqual([sha(body)])
  })

  it('deduplicates identical hashes', () => {
    expect(collectInlineScriptHashes('<script>a=1</script><script>a=1</script>')).toEqual([sha('a=1')])
  })

  it('hashes inline modules (Astro bundles them without a src)', () => {
    expect(collectInlineScriptHashes('<script type="module">import "x"</script>')).toEqual([sha('import "x"')])
  })

  it('does not mistake data-src/data-type for an external script or a data block', () => {
    // `data-src`/`data-type` are NOT `src`/`type`: the script is executable and must be hashed.
    expect(collectInlineScriptHashes('<script data-src="x">a=1</script>')).toEqual([sha('a=1')])
    expect(collectInlineScriptHashes('<script data-type="application/json">a=2</script>')).toEqual([sha('a=2')])
  })

  it('matches the digest the browser expects (known baseline)', () => {
    // Sanity check: SHA-256 base64 of 'a=1'. If this changes, hashing stopped matching.
    expect(sha('a=1')).toBe('sha256-wi/qXXQo5c9H72NUyXySI8ldbc3D4NIwD/eQVrH/PYU=')
  })
})

describe('injectCspMeta', () => {
  const csp = "default-src 'self'"

  it('injects after <meta charset>, ahead of every script', () => {
    const out = injectCspMeta('<head><meta charset="utf-8"><script>x</script></head>', csp)
    expect(out).toContain('<meta charset="utf-8"><meta http-equiv="Content-Security-Policy"')
    expect(out.indexOf('charset')).toBeLessThan(out.indexOf('Content-Security-Policy'))
    expect(out.indexOf('Content-Security-Policy')).toBeLessThan(out.indexOf('<script>'))
  })

  it('falls back to right after <head> when charset is missing', () => {
    expect(injectCspMeta('<head><script>x</script></head>', csp)).toContain(
      '<head><meta http-equiv="Content-Security-Policy"',
    )
  })

  it('is a no-op without a head', () => {
    expect(injectCspMeta('<div>x</div>', csp)).toBe('<div>x</div>')
  })
})

describe('buildCspContent', () => {
  const csp = buildCspContent([sha('a=1')])
  const directive = (name: string) => csp.split('; ').find((d) => d.startsWith(name)) ?? ''

  it('script-src: hash plus self, never unsafe-inline', () => {
    const scriptSrc = directive('script-src')
    expect(scriptSrc).toContain(`'${sha('a=1')}'`)
    expect(scriptSrc).toContain("'self'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('style-src: permissive on purpose (unsafe-inline, no hashes)', () => {
    const styleSrc = directive('style-src')
    expect(styleSrc).toContain("'unsafe-inline'")
    expect(styleSrc).not.toContain('sha256-')
  })

  it('no frame-ancestors in the meta (header-only directive)', () => {
    expect(csp).not.toContain('frame-ancestors')
  })

  it('carries the hosts the CMP and analytics need, on every directive they touch', () => {
    // Get one of these wrong and the cookie banner never renders in production,
    // with no error anywhere: a GDPR failure that looks like nothing.
    expect(directive('script-src')).toContain('https://cdn.iubenda.com')
    expect(directive('script-src')).toContain('https://cs.iubenda.com')
    expect(directive('script-src')).toContain('https://www.googletagmanager.com')
    expect(directive('style-src')).toContain('https://cdn.iubenda.com')
    expect(directive('img-src')).toContain('https://*.google-analytics.com')
    expect(directive('connect-src')).toContain('https://*.iubenda.com')
    expect(directive('frame-src')).toContain('https://www.googletagmanager.com')
  })

  it('keeps the directives carried over from the vercel.json policy', () => {
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })
})
