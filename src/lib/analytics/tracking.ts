import { PUBLIC_GTM_ID, PUBLIC_IUBENDA_COOKIE_POLICY_ID, PUBLIC_IUBENDA_SITE_ID } from 'astro:env/client'

export interface TrackingConfig {
  gtmId: string
  iubendaSiteId: string
  cookiePolicyId: string
}

// iubenda ids are numeric; Vercel "sensitive" vars reach prebuilt pulls as the
// literal string [SENSITIVE] — treat any non-numeric value as unset rather than
// building a 404 API URL out of it. Create these as Plain variables on Vercel:
// they are public ids, not secrets, and the build reads env at `vercel pull` time.
function numericId(value: string | undefined): string {
  const id = value ?? ''
  return /^\d+$/.test(id) ? id : ''
}

/**
 * null unless BOTH the GTM container and the iubenda site id are configured:
 * with no active tracking there is no non-essential cookie, so the CMP banner
 * itself isn't required — dev and cookieless deploys stay script-free, and the
 * layout renders neither script.
 *
 * Multi-locale: iubenda issues one policy id per language. Add a
 * `PUBLIC_IUBENDA_COOKIE_POLICY_ID_<LOCALE>` env per extra language and pick
 * between them here on `Astro.currentLocale`.
 */
export function getTrackingConfig(): TrackingConfig | null {
  const gtmId = PUBLIC_GTM_ID ?? ''
  const iubendaSiteId = numericId(PUBLIC_IUBENDA_SITE_ID)
  if (gtmId === '' || iubendaSiteId === '') return null

  return { gtmId, iubendaSiteId, cookiePolicyId: numericId(PUBLIC_IUBENDA_COOKIE_POLICY_ID) }
}
