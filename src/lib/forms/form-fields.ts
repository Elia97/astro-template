import { z } from 'astro/zod'

import { useTranslations } from '@/i18n/translate'

// Reusable field contracts for every action-backed form — one shape, one copy
// source. The messages are user-facing: applyFieldErrors()
// (src/components/forms/field-errors.ts) prints them raw into each field's error
// slot, so they belong in the dictionary like the rest of the site copy.
//
// Resolved at the default locale because a schema is module-level, outside any
// request. With `locales: ['it']` (astro.config.mjs) there is no other one to
// serve; adding a locale means resolving the message per request instead —
// build the schema inside the action handler, where the locale is known.
const t = useTranslations()

/**
 * Required free-text field. One message covers both a missing field
 * (invalid_type) and an empty or whitespace-only one (too_small) — to the user
 * they are the same "you didn't fill this in". `.trim()` runs before `.min(1)`,
 * so "   " counts as empty.
 *
 * [HARD] A field marked `required` in the markup must use this, not
 * `.default('')`: the form is `novalidate`, so this schema is the only gate that
 * actually runs on a submit.
 */
export function requiredText(message: string) {
  return z.string({ error: message }).trim().min(1, { error: message })
}

export const emailField = z
  .string({ error: t('forms.error.emailInvalid') })
  .trim()
  .max(254, { error: t('forms.error.emailTooLong') })
  .pipe(z.email({ error: t('forms.error.emailInvalid') }))

// GDPR consent must be an explicit true — not merely truthy.
export const consentField = z.literal(true, { error: t('forms.error.consentRequired') })
