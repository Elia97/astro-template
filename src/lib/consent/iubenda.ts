import { type ConsentGate, type ConsentPreference, consentGate } from '@/lib/consent/gate'

// iubenda Cookie Solution: the CMP that collects the preference the gate then
// enforces. Swapping vendor means replacing this file — `gate.ts` is where the
// rest of the app talks to, and it only knows about categories.

export interface IubendaCsCallback {
  onPreferenceExpressed: (pref: ConsentPreference) => void
  onConsentRead: (pref: ConsentPreference) => void
}

export interface IubendaCsConfiguration {
  siteId: number
  cookiePolicyId: number
  lang: string
  consentOnContinuedBrowsing: boolean
  perPurposeConsent: boolean
  floatingPreferencesButtonDisplay: boolean
  callback: IubendaCsCallback
}

/**
 * - `consentOnContinuedBrowsing` MUST stay false: scroll or continued browsing
 *   is not valid consent under the Garante's 2021 cookie guidelines.
 * - `perPurposeConsent` drives the granular purposes the gate maps to Consent Mode.
 * - `floatingPreferencesButtonDisplay` false hides iubenda's persistent floating
 *   badge. Consent stays revocable through the footer's
 *   `.iubenda-cs-preferences-link` (src/components/layout/footer.astro), so the
 *   GDPR right to withdraw is preserved, not removed — [HARD] keep that link if
 *   you keep this false.
 */
export function buildCsConfiguration(opts: {
  siteId: string
  cookiePolicyId: string
  lang: string
  onPreference: (pref: ConsentPreference) => void
}): IubendaCsConfiguration {
  return {
    siteId: Number(opts.siteId),
    cookiePolicyId: Number(opts.cookiePolicyId),
    lang: opts.lang,
    consentOnContinuedBrowsing: false,
    perPurposeConsent: true,
    floatingPreferencesButtonDisplay: false,
    callback: {
      // onConsentRead fires on return visits (stored preference), so both paths
      // must reach the gate or a returning user would never re-grant.
      onPreferenceExpressed: opts.onPreference,
      onConsentRead: opts.onPreference,
    },
  }
}

export interface BootstrapDeps {
  win: Window & typeof globalThis
  doc: Document
  gate: ConsentGate
  loadScript: (src: string) => void
}

// Only the CS script: no autoblocking, no GPP stub. Nothing third-party loads
// before consent anyway (analytics/bootstrap.ts gates GTM), so autoblocking
// would just add a parser-blocking request and a second source of truth.
const IUBENDA_CS_SRC = 'https://cdn.iubenda.com/cs/iubenda_cs.js'

export function bootstrapIubenda(deps?: Partial<BootstrapDeps>): void {
  const win = deps?.win ?? window
  const doc = deps?.doc ?? document
  const gate = deps?.gate ?? consentGate
  const loadScript =
    deps?.loadScript ??
    ((src: string): void => {
      const script = doc.createElement('script')
      script.async = true
      script.src = src
      doc.head.appendChild(script)
    })

  if (win.__consentBootstrapped === true) return
  win.__consentBootstrapped = true

  // No site id → no CMP. Dev and any deploy that hasn't configured iubenda stay
  // script-free, which is also why nothing here needs a PROD guard.
  const cfg = win.__consentConfig
  if (cfg === undefined || cfg.siteId === '') return

  win.__consent = { onConsent: gate.onConsent }

  win._iub = win._iub ?? {}
  win._iub.csConfiguration = buildCsConfiguration({
    siteId: cfg.siteId,
    cookiePolicyId: cfg.cookiePolicyId,
    lang: cfg.lang,
    onPreference: (pref) => {
      gate.applyPreference(pref)
    },
  })

  loadScript(IUBENDA_CS_SRC)
}
