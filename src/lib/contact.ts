import { z } from 'astro/zod'

import { consentField, emailField, requiredText } from '@/lib/forms/form-fields'
import { honeypotShape } from '@/lib/forms/honeypot-schema'

import { useTranslations } from '@/i18n/translate'

const t = useTranslations()

// Contract of the contact action (src/actions/index.ts). Validation lives
// here so client and server share one source of truth; extending the form
// starts by extending this schema (docs/guides/forms-email.md).
//
// [HARD] `required` in the markup means required here. The form is `novalidate`
// (contact-form.astro), so this schema is the only gate that runs — a field the
// markup marks required but the schema defaults to '' accepts an empty submit
// from anything that isn't a browser.
export const contactSchema = z.object({
  ...honeypotShape,
  firstName: requiredText(t('forms.error.firstNameRequired')).max(100, {
    error: t('forms.error.firstNameTooLong'),
  }),
  lastName: requiredText(t('forms.error.lastNameRequired')).max(100, {
    error: t('forms.error.lastNameTooLong'),
  }),
  email: emailField,
  // Optional in the markup too — the only field the form doesn't insist on.
  message: z
    .string()
    .trim()
    .max(2000, { error: t('forms.error.messageTooLong') })
    .default(''),
  consent: consentField,
})

export type ContactRequest = z.infer<typeof contactSchema>

/** CRM attributes persisted with the contact (Brevo upsert). */
export function contactAttributes(request: ContactRequest): Record<string, string> {
  return {
    FIRSTNAME: request.firstName,
    LASTNAME: request.lastName,
  }
}
