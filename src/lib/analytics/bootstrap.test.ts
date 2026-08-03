// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { bootstrapAnalytics } from '@/lib/analytics/bootstrap'
import type { ConsentCategory } from '@/lib/consent/gate'

const GTM = 'GTM-TEST123'

/** A window whose document is real (so the script tag is built for real) but
 *  whose head collects instead of connecting — appending to the live document
 *  would have happy-dom fetch googletagmanager.com from a unit test. */
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

/** Captures the gate registration instead of granting it. */
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

  // [HARD] The rule the whole module exists for: registering is not loading.
  // Nothing may reach Google before the user has opted in.
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

  // GTM reads gtm.start off the dataLayer to time the container: pushing it
  // after the script would leave the container without a start time.
  it('pushes gtm.start before the container script', () => {
    const { win } = makeWin({ gtmId: GTM })
    const consent = makeConsent()
    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    consent.calls[0]?.grant()

    expect(window.dataLayer?.[0]).toMatchObject({ event: 'gtm.js' })
    expect(window.dataLayer?.[0]?.['gtm.start']).toEqual(expect.any(Number))
  })

  // A second grant (a re-expressed preference, a second bootstrap) must not add
  // a second container to the page.
  it('loads the container at most once', () => {
    const { win, appended } = makeWin({ gtmId: GTM })
    const consent = makeConsent()
    bootstrapAnalytics({ win, onConsent: consent.onConsent })

    consent.calls[0]?.grant()
    consent.calls[0]?.grant()

    expect(appended).toHaveLength(1)
  })

  // The real gate queues rather than granting, so nothing loads here — the
  // assertion is that wiring the default dependency doesn't throw.
  it('defaults to the real consent gate when none is injected', () => {
    const { win } = makeWin({ gtmId: GTM })

    expect(() => {
      bootstrapAnalytics({ win })
    }).not.toThrow()
  })
})
