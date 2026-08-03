// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type ConsentModeUpdate,
  type ConsentPreference,
  consentGate,
  createConsentGate,
  mapPreferenceToConsentMode,
  onConsent,
} from '@/lib/consent/gate'

const ALL_GRANTED: ConsentModeUpdate = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
}

const ALL_DENIED: ConsentModeUpdate = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
}

const ONLY_ANALYTICS: ConsentModeUpdate = { ...ALL_DENIED, analytics_storage: 'granted' }
const ONLY_ADS: ConsentModeUpdate = { ...ALL_GRANTED, analytics_storage: 'denied' }

const MAPPING_CASES: [string, ConsentPreference, ConsentModeUpdate][] = [
  ['accept all: consent=true, no granular purposes', { consent: true }, ALL_GRANTED],
  ['consent=true with an empty purposes object', { consent: true, purposes: {} }, ALL_GRANTED],
  ['purpose 4 only → analytics_storage', { purposes: { '4': true } }, ONLY_ANALYTICS],
  ['purpose 5 only → ad_* signals', { purposes: { '5': true } }, ONLY_ADS],
  ['purposes 4 + 5 → everything', { purposes: { '4': true, '5': true } }, ALL_GRANTED],
  // Granularity present ⇒ no "accept all" shortcut: the purposes win over consent.
  ['consent=true but purposes false', { consent: true, purposes: { '4': false, '5': false } }, ALL_DENIED],
  ['partial/undefined purposes', { purposes: { '4': undefined, '5': false } }, ALL_DENIED],
  ['consent=false, no purposes', { consent: false }, ALL_DENIED],
  ['empty preference (fail-safe default)', {}, ALL_DENIED],
]

describe('mapPreferenceToConsentMode', () => {
  it.each(MAPPING_CASES)('%s', (_label, pref, expected) => {
    expect(mapPreferenceToConsentMode(pref)).toEqual(expected)
  })
})

/** Fresh gate + its spies per test — no shared mock state to reset. */
function makeGate() {
  const gtag = vi.fn()
  const dispatchEvent = vi.fn()
  return { gate: createConsentGate({ gtag, dispatchEvent }), gtag, dispatchEvent }
}

describe('createConsentGate — consent queue', () => {
  it('queues callbacks registered before consent', () => {
    const { gate } = makeGate()
    const cb = vi.fn()

    gate.onConsent('measurement', cb)

    expect(cb).not.toHaveBeenCalled()
    expect(gate.hasConsent('measurement')).toBe(false)
  })

  it('drains a category queue once applyPreference grants it', () => {
    const { gate } = makeGate()
    const cb = vi.fn()
    gate.onConsent('measurement', cb)

    gate.applyPreference({ purposes: { '4': true } })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(gate.hasConsent('measurement')).toBe(true)
  })

  it('runs a callback immediately when consent was already granted', () => {
    const { gate } = makeGate()
    gate.applyPreference({ purposes: { '5': true } })

    const cb = vi.fn()
    gate.onConsent('marketing', cb)

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('drains multiple callbacks in FIFO order', () => {
    const { gate } = makeGate()
    const order: number[] = []
    gate.onConsent('marketing', () => order.push(1))
    gate.onConsent('marketing', () => order.push(2))
    gate.onConsent('marketing', () => order.push(3))

    gate.applyPreference({ purposes: { '5': true } })

    expect(order).toEqual([1, 2, 3])
  })

  it('grants a category with no queued callbacks without throwing', () => {
    const { gate } = makeGate()

    gate.applyPreference({ consent: true })

    expect(gate.hasConsent('measurement')).toBe(true)
    expect(gate.hasConsent('marketing')).toBe(true)
  })
})

describe('createConsentGate — applyPreference', () => {
  it("calls gtag('consent','update',…) with the mapped update", () => {
    const { gate, gtag } = makeGate()

    gate.applyPreference({ consent: true })

    expect(gtag).toHaveBeenCalledExactlyOnceWith('consent', 'update', ALL_GRANTED)
  })

  it("dispatches CustomEvent('consent_given') with detail { update, preference }", () => {
    const { gate, dispatchEvent } = makeGate()
    const preference = { purposes: { '4': true } }

    gate.applyPreference(preference)

    const event = dispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.type).toBe('consent_given')
    expect(event.detail).toEqual({ update: ONLY_ANALYTICS, preference })
  })

  it('keeps categories independent: measurement does not unlock marketing', () => {
    const { gate } = makeGate()
    const marketingCb = vi.fn()
    gate.onConsent('marketing', marketingCb)

    gate.applyPreference({ purposes: { '4': true } })

    expect(gate.hasConsent('marketing')).toBe(false)
    expect(marketingCb).not.toHaveBeenCalled()
  })

  it('drains no queue when the preference denies everything', () => {
    const { gate, gtag } = makeGate()
    const cb = vi.fn()
    gate.onConsent('measurement', cb)

    gate.applyPreference({ consent: false })

    expect(cb).not.toHaveBeenCalled()
    expect(gtag).toHaveBeenCalledExactlyOnceWith('consent', 'update', ALL_DENIED)
  })
})

describe('consentGate / onConsent singleton', () => {
  beforeEach(() => {
    window.gtag = vi.fn()
  })

  it('delegates gtag and dispatchEvent to the real window', () => {
    const gtagSpy = vi.spyOn(window, 'gtag')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    consentGate.applyPreference({ consent: true })

    expect(gtagSpy).toHaveBeenCalledWith('consent', 'update', ALL_GRANTED)
    const event = dispatchSpy.mock.calls[0]?.[0] as CustomEvent
    expect(event.type).toBe('consent_given')

    gtagSpy.mockRestore()
    dispatchSpy.mockRestore()
  })

  it('exports onConsent as a standalone callable (closure, no this)', () => {
    consentGate.applyPreference({ consent: true })
    const cb = vi.fn()
    onConsent('measurement', cb)
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
