import { PUBLIC_GTM_ID, PUBLIC_IUBENDA_COOKIE_POLICY_ID, PUBLIC_IUBENDA_SITE_ID } from 'astro:env/client'

export interface TrackingConfig {
  gtmId: string
  iubendaSiteId: string
  cookiePolicyId: string
}

// Vercel "sensitive" vars reach a prebuilt pull as the literal string [SENSITIVE];
// create these as Plain variables — the build reads env at `vercel pull` time.
function numericId(value: string | undefined): string {
  const id = value ?? ''
  return /^\d+$/.test(id) ? id : ''
}

/** null unless both are set: with no tags there is no non-essential cookie, so no
 *  consent banner is legally required. */
export function getTrackingConfig(): TrackingConfig | null {
  const gtmId = PUBLIC_GTM_ID ?? ''
  const iubendaSiteId = numericId(PUBLIC_IUBENDA_SITE_ID)
  if (gtmId === '' || iubendaSiteId === '') return null

  return { gtmId, iubendaSiteId, cookiePolicyId: numericId(PUBLIC_IUBENDA_COOKIE_POLICY_ID) }
}
