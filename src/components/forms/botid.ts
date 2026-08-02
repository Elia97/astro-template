import { initBotId } from 'botid/client/core'

// Vercel BotID Basic — free on every plan, no cookie, no consent surface.
// initBotId patches fetch/XHR so a POST toward these paths carries a challenge
// header; checkBotId() in src/actions/index.ts validates it server-side. The
// paths are the ones Astro's action client calls (`<base>/_actions/<name>`) —
// a path missing here always reads as a bot.
const PROTECTED_ACTIONS = [{ path: '/_actions/contact', method: 'POST' }]

// Not idempotent upstream: every call re-patches fetch/XHR and resets the
// challenge state. The guard matters under view transitions, where a module can
// be re-entered without a full page load.
let initialized = false

// Production-only: the challenge script is served by the vercel.json rewrites,
// which `astro dev` never reads — initializing locally would leave every action
// POST waiting on a 404. The server guard is gated on the same condition.
export function initFormBotId(): void {
  if (!import.meta.env.PROD || initialized) return
  initialized = true
  initBotId({ protect: PROTECTED_ACTIONS })
}
