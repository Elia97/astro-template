import type { ConsentCategory, GtagFn } from '@/lib/consent/gate'

// `dataLayer` is deliberately NOT declared here: src/lib/analytics/data-layer.ts
// already owns that global (`DataLayerEvent[]`), and a second declaration with a
// different type would break the interface merge.
declare global {
  interface Window {
    gtag: GtagFn
    _iub?: { csConfiguration?: unknown }
    /** Written by the head component, read by the bootstrap — the seam that keeps
     *  server-resolved env out of the client module graph. */
    __consentConfig?: { siteId: string; cookiePolicyId: string; lang: string }
    __consent?: {
      onConsent: (category: ConsentCategory, callback: () => void) => void
    }
    __consentBootstrapped?: boolean
  }
}
