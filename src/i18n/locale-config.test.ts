import { i18n as stubbedI18n } from '@test/stubs/astro-config-client'
import { describe, expect, it } from 'vitest'

import { SITE } from '@/lib/site'

import astroConfig from '../../astro.config.mjs'

// The locale list exists in three places that cannot import each other:
// astro.config.mjs routes them, SITE.localeTags maps each to a BCP 47 tag, and
// test/stubs/astro-config-client.ts mirrors the config for unit tests. Drift
// between them is silent — a missing tag degrades hreflang to a bare code, and a
// stale stub makes every i18n test pass against a site that no longer exists.
//
// Nothing here can be derived away: Astro allows object locale entries
// (`{ path, codes }`) that a plain key list could not express, and the stub
// cannot import the config it stands in for.

type LocaleEntry = string | { path: string; codes: string[] }

const i18n = (astroConfig as { i18n?: { defaultLocale: string; locales: LocaleEntry[] } }).i18n

// Astro's APIs and Astro.currentLocale speak codes; for an object entry that is
// codes[0]. Same normalisation as src/components/head/seo.ts.
function codesOf(locales: readonly LocaleEntry[]): string[] {
  return locales.map((locale) => (typeof locale === 'string' ? locale : (locale.codes[0] ?? locale.path)))
}

describe('locale configuration stays in one shape', () => {
  it('routes at least one locale', () => {
    expect(i18n?.locales?.length).toBeGreaterThan(0)
  })

  it('gives every routed locale a BCP 47 tag', () => {
    const tagged = Object.keys(SITE.localeTags)
    for (const code of codesOf(i18n?.locales ?? [])) {
      expect(tagged, `astro.config.mjs routes "${code}" but SITE.localeTags has no tag for it`).toContain(code)
    }
  })

  it('has no tag for a locale that is not routed', () => {
    const routed = codesOf(i18n?.locales ?? [])
    for (const code of Object.keys(SITE.localeTags)) {
      expect(routed, `SITE.localeTags maps "${code}" but astro.config.mjs does not route it`).toContain(code)
    }
  })

  it('routes its own default locale', () => {
    expect(codesOf(i18n?.locales ?? [])).toContain(i18n?.defaultLocale)
  })

  // The one that would otherwise fail silently: tests read the stub, so a stub
  // that has drifted asserts the wrong world while staying green.
  it('keeps the unit-test stub mirroring the real config', () => {
    expect(stubbedI18n.defaultLocale).toBe(i18n?.defaultLocale)
    expect(stubbedI18n.locales).toEqual(codesOf(i18n?.locales ?? []))
  })
})
