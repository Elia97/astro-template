import { describe, expect, it } from 'vitest'

import { ctaSchema } from '@/lib/schemas/common'

function parseUrl(url: string): boolean {
  return ctaSchema.safeParse({ label: 'Azione', url }).success
}

describe('ctaSchema url', () => {
  it.each([
    '/contatti',
    '/',
    '#servizi',
    'https://example.com',
    'http://example.com',
    'mailto:a@example.com',
    'tel:+390123456',
  ])('accepts %s', (url) => {
    expect(parseUrl(url)).toBe(true)
  })

  // These are the ones that reach an href unescaped. `URL.canParse` says yes to
  // the first two, and the third reads as a relative path while leaving the site.
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example/phish'])(
    'rejects %s',
    (url) => {
      expect(parseUrl(url)).toBe(false)
    },
  )

  it('rejects an empty url', () => {
    expect(parseUrl('')).toBe(false)
  })
})
