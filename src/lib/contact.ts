import { z } from 'astro/zod'

import { consentField, emailField, requiredText } from '@/lib/forms/form-fields'
import { honeypotShape } from '@/lib/forms/honeypot-schema'

import { useTranslations } from '@/i18n/translate'

const t = useTranslations()

// [HARD] `required` in the markup means required here: the form is `novalidate`
// (contact-form.astro), so this schema is the only gate that runs on a submit.
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

export function contactAttributes(request: ContactRequest): Record<string, string> {
  return {
    FIRSTNAME: request.firstName,
    LASTNAME: request.lastName,
  }
}
