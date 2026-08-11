// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { bootstrapAnalytics } from '@/lib/analytics/bootstrap'
import type { ConsentCategory } from '@/lib/consent/gate'

const GTM = 'GTM-TEST123'

/** The head collects instead of connecting: appending for real would have happy-dom
 *  fetch googletagmanager.com from a unit test. */
function makeWin(config?: { gtmId: string }) {
  const appended: HTMLScriptElement[] = []
  const win = {
    __analyticsConfig: config,
    document: {
      createElement: (tag: string) => document.createElement(tag),
      head: {
        appendChild: (element: HTMLScriptElement) => {
          appended.push(element)
        },
      },
    },
  } as unknown as Window & typeof globalThis
  return { win, appended }
}

function makeConsent() {
  const calls: { category: ConsentCategory; grant: () => void }[] = []
  const onConsent = (category: ConsentCategory, callback: () => void) => {
    calls.push({ category, grant: callback })
  }
  return { onConsent, calls }
}

beforeEach(() => {
  window.dataLayer = []
})

describe('bootstrapAnalytics — before consent', () => {
  it('does nothing without a config', () => {
    const { win, appended } = makeWin()
    const consent = makeConsent()

    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    expect(consent.calls).toHaveLength(0)
    expect(appended).toHaveLength(0)
  })

  it('does nothing when the container id is empty', () => {
    const { win, appended } = makeWin({ gtmId: '' })
    const consent = makeConsent()

    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    expect(consent.calls).toHaveLength(0)
    expect(appended).toHaveLength(0)
  })

  // [HARD] Registering is not loading: nothing reaches Google before the opt-in.
  it('registers for measurement consent without loading anything yet', () => {
    const { win, appended } = makeWin({ gtmId: GTM })
    const consent = makeConsent()

    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    expect(consent.calls[0]?.category).toBe('measurement')
    expect(appended).toHaveLength(0)
  })
})

describe('bootstrapAnalytics — after consent', () => {
  it('loads the container once consent is granted', () => {
    const { win, appended } = makeWin({ gtmId: GTM })
    const consent = makeConsent()
    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    consent.calls[0]?.grant()

    expect(appended[0]?.src).toBe(`https://www.googletagmanager.com/gtm.js?id=${GTM}`)
    expect(appended[0]?.async).toBe(true)
  })

  it('pushes gtm.start before the container script', () => {
    const { win } = makeWin({ gtmId: GTM })
    const consent = makeConsent()
    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    consent.calls[0]?.grant()

    expect(window.dataLayer?.[0]).toMatchObject({ event: 'gtm.js' })
    expect(window.dataLayer?.[0]?.['gtm.start']).toEqual(expect.any(Number))
  })

  it('loads the container at most once', () => {
    const { win, appended } = makeWin({ gtmId: GTM })
    const consent = makeConsent()
    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    consent.calls[0]?.grant()
    consent.calls[0]?.grant()

    expect(appended).toHaveLength(1)
  })

  it('defaults to the real consent gate when none is injected', () => {
    const { win } = makeWin({ gtmId: GTM })

    expect(() => {
      bootstrapAnalytics({ win })
    }).not.toThrow()
  })
})

describe('default dependencies', () => {
  it('falls back to the real globals when called without deps', () => {
    expect(() => {
      bootstrapAnalytics()
    }).not.toThrow()
  })
})
