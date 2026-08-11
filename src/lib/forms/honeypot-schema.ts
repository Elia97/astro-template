import { z } from 'astro/zod'

import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// Split from ./honeypot.ts for the [HARD] bundle reason noted there.

// [HARD] `.catch()` keeps the shape total: `defineAction` validates before the handler
// runs, and a 400 naming `website` tells the bot which field to blank next run.
export const honeypotShape = {
  [HONEYPOT_FIELD]: z.string().trim().max(200).default('').catch('__unparseable__'),
}
