import { initBotId } from 'botid/client/core'

// The paths Astro's action client calls (`<base>/_actions/<name>`): one missing
// here carries no challenge header and reads as a bot in src/actions/index.ts.
const PROTECTED_ACTIONS = [{ path: '/_actions/contact', method: 'POST' }]

// initBotId is not idempotent upstream: every call re-patches fetch/XHR and resets the challenge.
let initialized = false

// The challenge script is served by the vercel.json rewrites, which `astro dev` never reads.
export function initFormBotId(): void {
  if (!import.meta.env.PROD || initialized) return
  initialized = true
  initBotId({ protect: PROTECTED_ACTIONS })
}
