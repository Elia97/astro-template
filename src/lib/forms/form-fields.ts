import { z } from 'astro/zod'

import { useTranslations } from '@/i18n/translate'

// Resolved at module level, outside any request: a second locale means building the
// schema inside the action handler, where the locale is known.
const t = useTranslations()

/** [HARD] A field marked `required` in the markup uses this, not `.default('')`: the
 *  form is `novalidate`, so this schema is the only gate that runs on a submit. */
export function requiredText(message: string) {
  return z.string({ error: message }).trim().min(1, { error: message })
}

export const emailField = z
  .string({ error: t('forms.error.emailInvalid') })
  .trim()
  .max(254, { error: t('forms.error.emailTooLong') })
  .pipe(z.email({ error: t('forms.error.emailInvalid') }))

export const consentField = z.literal(true, { error: t('forms.error.consentRequired') })
