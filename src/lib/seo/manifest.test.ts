import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

import { buildWebManifest } from '@/lib/seo/manifest'
import { SITE } from '@/lib/site'

const manifest = buildWebManifest()

// Resolved from the project root (vitest's cwd), not relative to this file:
// `public/` is a fixed top-level directory, so a path counted in `../` breaks
// the moment this test moves — which is exactly how it broke once.
const publicFile = (src: string) => join(process.cwd(), 'public', src)

describe('web manifest', () => {
  // The failure this exists for: an icon listed here but not shipped is a 404
  // the browser only reports at install time, where nobody is looking.
  it('declares only icons that exist in public/', () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
      expect(existsSync(publicFile(icon.src)), icon.src).toBe(true)
    }
  })

  it('takes its identity from SITE, so the install can not drift from the site', () => {
    expect(manifest.name).toBe(SITE.name)
    expect(manifest.short_name).toBe(SITE.name)
    expect(manifest.description).toBe(SITE.description)
  })

  // Changing `id` makes browsers treat the site as a different app: an existing
  // install stops updating and the prompt comes back.
  it('pins the app identity and the navigation scope at the root', () => {
    expect(manifest.id).toBe('/')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
  })

  it('carries the light theme colour, the state an install starts from', () => {
    expect(manifest.theme_color).toBe(SITE.themeColor.light)
    expect(manifest.background_color).toBe(SITE.themeColor.light)
  })

  it('serializes to JSON, since that is how it is served', () => {
    expect(() => JSON.stringify(manifest)).not.toThrow()
    expect(JSON.parse(JSON.stringify(manifest)).icons).toHaveLength(manifest.icons.length)
  })
})

describe('SITE.themeColor', () => {
  // A `<meta name="theme-color">` is parsed by the browser UI layer, where
  // oklch support is narrower than in CSS — hex is the portable form.
  it('is hex on both themes', () => {
    expect(SITE.themeColor.light).toMatch(/^#[0-9a-f]{6}$/)
    expect(SITE.themeColor.dark).toMatch(/^#[0-9a-f]{6}$/)
  })
})
