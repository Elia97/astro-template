// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

import type { ConsentGate, ConsentPreference } from '@/lib/consent/gate'
import { type BootstrapDeps, bootstrapIubenda, buildCsConfiguration } from '@/lib/consent/iubenda'

const CONFIG = { siteId: '1234567', cookiePolicyId: '7654321', lang: 'it' }

function makeGate(): ConsentGate & { applyPreference: ReturnType<typeof vi.fn> } {
  return {
    onConsent: vi.fn(),
    applyPreference: vi.fn(),
    hasConsent: vi.fn(() => false),
  } as unknown as ConsentGate & { applyPreference: ReturnType<typeof vi.fn> }
}

function makeWin(config?: typeof CONFIG) {
  const win = { __consentConfig: config } as unknown as Window & typeof globalThis
  return win
}

function boot(overrides: Partial<BootstrapDeps> = {}) {
  const gate = overrides.gate ?? makeGate()
  const loadScript = vi.fn()
  const win = overrides.win ?? makeWin(CONFIG)
  bootstrapIubenda({ win, doc: document, gate, loadScript, ...overrides })
  return { win, gate, loadScript }
}

describe('buildCsConfiguration', () => {
  // Numbers, not strings: iubenda's own widget rejects the string form silently.
  it('converts the ids to numbers', () => {
    const cfg = buildCsConfiguration({ ...CONFIG, onPreference: vi.fn() })
    expect(cfg.siteId).toBe(1234567)
    expect(cfg.cookiePolicyId).toBe(7654321)
  })

  // [HARD] Continued browsing is not consent under the Garante's 2021 guidelines.
  it('never accepts consent on continued browsing', () => {
    expect(buildCsConfiguration({ ...CONFIG, onPreference: vi.fn() }).consentOnContinuedBrowsing).toBe(false)
  })

  it('asks for per-purpose consent, which is what the gate maps', () => {
    expect(buildCsConfiguration({ ...CONFIG, onPreference: vi.fn() }).perPurposeConsent).toBe(true)
  })

  it('routes both the fresh and the stored preference to the same handler', () => {
    const onPreference = vi.fn()
    const { callback } = buildCsConfiguration({ ...CONFIG, onPreference })
    const pref: ConsentPreference = { consent: true }

    callback.onPreferenceExpressed(pref)
    callback.onConsentRead(pref)

    expect(onPreference).toHaveBeenCalledTimes(2)
  })
})

describe('bootstrapIubenda', () => {
  it('loads the CMP and publishes the config when a site id is set', () => {
    const { win, loadScript } = boot()

    expect(loadScript).toHaveBeenCalledWith('https://cdn.iubenda.com/cs/iubenda_cs.js')
    expect(win._iub?.csConfiguration).toBeDefined()
  })

  it('does nothing without a config', () => {
    const { loadScript, win } = boot({ win: makeWin() })

    expect(loadScript).not.toHaveBeenCalled()
    expect(win._iub).toBeUndefined()
  })

  it('does nothing when the site id is empty', () => {
    const { loadScript } = boot({ win: makeWin({ ...CONFIG, siteId: '' }) })

    expect(loadScript).not.toHaveBeenCalled()
  })
})

describe('bootstrapIubenda — wiring', () => {
  it('exposes the gate on the window for scripts outside the module graph', () => {
    const { win, gate } = boot()

    expect(win.__consent?.onConsent).toBe(gate.onConsent)
  })

  it('is idempotent', () => {
    const win = makeWin(CONFIG)
    const loadScript = vi.fn()

    bootstrapIubenda({ win, doc: document, gate: makeGate(), loadScript })
    bootstrapIubenda({ win, doc: document, gate: makeGate(), loadScript })

    expect(loadScript).toHaveBeenCalledTimes(1)
  })

  it('hands the CMP preference to the gate', () => {
    const { win, gate } = boot()
    const cfg = win._iub?.csConfiguration as ReturnType<typeof buildCsConfiguration>
    const pref: ConsentPreference = { purposes: { '4': true } }

    cfg.callback.onPreferenceExpressed(pref)

    expect(gate.applyPreference).toHaveBeenCalledWith(pref)
  })

  // Never connected: appending for real would have happy-dom fetch the CDN from a unit test.
  it('appends an async script tag when no loader is injected', () => {
    const appended: HTMLScriptElement[] = []
    const doc = {
      createElement: (tag: string) => document.createElement(tag),
      head: {
        appendChild: (element: HTMLScriptElement) => {
          appended.push(element)
        },
      },
    } as unknown as Document

    bootstrapIubenda({ win: makeWin(CONFIG), doc, gate: makeGate() })

    expect(appended[0]?.src).toBe('https://cdn.iubenda.com/cs/iubenda_cs.js')
    expect(appended[0]?.async).toBe(true)
  })
})

describe('default dependencies', () => {
  it('falls back to the real globals when called without deps', () => {
    expect(() => {
      bootstrapIubenda()
    }).not.toThrow()
  })
})
