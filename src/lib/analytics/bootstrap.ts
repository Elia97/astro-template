import { pushToDataLayer } from '@/lib/analytics/data-layer'
import { type ConsentCategory, onConsent as defaultOnConsent } from '@/lib/consent/gate'

export interface AnalyticsBootstrapDeps {
  win: Window & typeof globalThis
  onConsent: (category: ConsentCategory, callback: () => void) => void
}

function loadGtm(win: Window & typeof globalThis, gtmId: string): void {
  if (win.__analyticsLoaded === true) return
  win.__analyticsLoaded = true

  // gtm.start before the container script: GTM reads it off the dataLayer to
  // time the container. GA4 itself is configured inside the container, so
  // there's no direct gtag.js path here.
  pushToDataLayer({ 'gtm.start': Date.now(), event: 'gtm.js' })

  const script = win.document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
  win.document.head.appendChild(script)
}

/**
 * GTM loads ONLY after 'measurement' consent — nothing reaches Google before the
 * user opts in.
 *
 * Deliberately the "basic" Consent Mode shape: advanced would send cookieless
 * pings for modeling, which a site this size can never make eligible (Google
 * requires roughly 1k daily events on each side of the consent split).
 */
export function bootstrapAnalytics(deps?: Partial<AnalyticsBootstrapDeps>): void {
  const win = deps?.win ?? window
  const onConsent = deps?.onConsent ?? defaultOnConsent

  const config = win.__analyticsConfig
  if (config === undefined || config.gtmId === '') return

  onConsent('measurement', () => {
    loadGtm(win, config.gtmId)
  })
}
