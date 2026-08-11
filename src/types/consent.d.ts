import type { ConsentCategory, GtagFn } from '@/lib/consent/gate'

// `dataLayer` is NOT declared here: src/lib/analytics/data-layer.ts already owns
// that global as `DataLayerEvent[]`.
declare global {
  interface Window {
    gtag: GtagFn
    _iub?: { csConfiguration?: unknown }
    // Written by src/components/head/tracking.astro, read by src/lib/consent/iubenda.ts.
    __consentConfig?: { siteId: string; cookiePolicyId: string; lang: string }
    __consent?: {
      onConsent: (category: ConsentCategory, callback: () => void) => void
    }
    __consentBootstrapped?: boolean
  }
}
