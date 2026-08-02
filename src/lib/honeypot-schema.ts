import { z } from 'astro/zod'

import { HONEYPOT_FIELD } from '@/lib/honeypot'

// Server-side half of the honeypot — see the [HARD] note in ./honeypot.ts for
// why the constant and the schema shape are separate modules.
//
// The shape ACCEPTS a filled decoy instead of rejecting it: a validation error
// would tell the bot which field gave it away. Dropping the submission silently
// is the action's job (src/actions/index.ts).
export const honeypotShape = {
  [HONEYPOT_FIELD]: z.string().trim().max(200).default(''),
}
