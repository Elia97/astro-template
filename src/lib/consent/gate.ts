// Consent gate: the queue every consent-dependent script waits in, and the
// translation from a CMP preference to Google Consent Mode v2.
//
// The rule this module exists to enforce: nothing that sets a non-essential
// cookie runs until the user has said yes. Callers register through
// `onConsent(category, cb)` and are called back the moment consent for that
// category arrives — or immediately, if it already had.
//
// Leaf layer: no imports from the rendering tree.

export type ConsentCategory = 'measurement' | 'marketing'

export interface ConsentPreference {
  consent?: boolean
  purposes?: Record<string, boolean | undefined>
}

export interface ConsentModeUpdate {
  ad_storage: 'granted' | 'denied'
  ad_user_data: 'granted' | 'denied'
  ad_personalization: 'granted' | 'denied'
  analytics_storage: 'granted' | 'denied'
}

export type GtagFn = (...args: unknown[]) => void

// iubenda purpose ids, as emitted in the CS preference object: 4 = Measurement,
// 5 = Marketing. They are iubenda's numbering, not ours — don't renumber.
const PURPOSE_MEASUREMENT = '4'
const PURPOSE_MARKETING = '5'

// Fail-safe by construction: anything not explicitly `true` maps to 'denied'.
export function mapPreferenceToConsentMode(pref: ConsentPreference): ConsentModeUpdate {
  const purposes = pref.purposes
  const hasGranularPurposes = purposes !== undefined && Object.keys(purposes).length > 0

  // "Accept all" arrives as consent=true with no granular purposes. When
  // purposes ARE present they win, even alongside consent=true.
  if (pref.consent === true && !hasGranularPurposes) {
    return {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    }
  }

  const measurementGranted = purposes?.[PURPOSE_MEASUREMENT] === true
  const marketingGranted = purposes?.[PURPOSE_MARKETING] === true

  return {
    ad_storage: marketingGranted ? 'granted' : 'denied',
    ad_user_data: marketingGranted ? 'granted' : 'denied',
    ad_personalization: marketingGranted ? 'granted' : 'denied',
    analytics_storage: measurementGranted ? 'granted' : 'denied',
  }
}

export interface ConsentGateDeps {
  gtag: GtagFn
  dispatchEvent: (event: Event) => void
}

export interface ConsentGate {
  onConsent: (category: ConsentCategory, callback: () => void) => void
  applyPreference: (pref: ConsentPreference) => void
  hasConsent: (category: ConsentCategory) => boolean
}

export function createConsentGate(deps: ConsentGateDeps): ConsentGate {
  const queues = new Map<ConsentCategory, (() => void)[]>()
  const granted = new Set<ConsentCategory>()

  const onConsent = (category: ConsentCategory, callback: () => void): void => {
    if (granted.has(category)) {
      callback()
      return
    }
    const queue = queues.get(category) ?? []
    queue.push(callback)
    queues.set(category, queue)
  }

  const grant = (category: ConsentCategory): void => {
    granted.add(category)
    const queue = queues.get(category)
    if (queue === undefined) return
    for (const callback of queue) callback()
    queues.delete(category)
  }

  const applyPreference = (pref: ConsentPreference): void => {
    const update = mapPreferenceToConsentMode(pref)
    deps.gtag('consent', 'update', update)

    if (update.analytics_storage === 'granted') grant('measurement')
    if (update.ad_storage === 'granted') grant('marketing')

    deps.dispatchEvent(new CustomEvent('consent_given', { detail: { update, preference: pref } }))
  }

  const hasConsent = (category: ConsentCategory): boolean => granted.has(category)

  return { onConsent, applyPreference, hasConsent }
}

export const consentGate = createConsentGate({
  gtag: (...args) => {
    window.gtag(...args)
  },
  dispatchEvent: (event) => {
    window.dispatchEvent(event)
  },
})

export const onConsent = consentGate.onConsent
