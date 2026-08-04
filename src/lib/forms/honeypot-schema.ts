import { z } from 'astro/zod'

import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// Server-side half of the honeypot — see the [HARD] note in ./honeypot.ts for
// why the constant and the schema shape are separate modules.
//
// The shape ACCEPTS a filled decoy instead of rejecting it: a validation error
// would tell the bot which field gave it away. Dropping the submission silently
// is the action's job (src/actions/index.ts).
//
// [HARD] The `.catch()` is what makes that total, and it is the whole point.
// `defineAction` validates BEFORE the handler runs, so without it a decoy over
// 200 chars — a link-spam bot pasting a URL list, the common case — fails
// validation and Astro answers 400 with `fields: { website: [...] }`. The bot
// reads the field name out of the response and blanks it next run. Any value
// that can't parse becomes a non-empty string instead, so `isHoneypotFilled`
// sees it and the submission is dropped in silence, as designed.
export const honeypotShape = {
  [HONEYPOT_FIELD]: z.string().trim().max(200).default('').catch('__unparseable__'),
}
