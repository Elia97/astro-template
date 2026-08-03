import { describe, expect, it } from 'vitest'

import { contactSchema } from '@/lib/contact'
import { consentField, emailField, requiredText } from '@/lib/forms/form-fields'

import { it as dictionary } from '@/i18n/strings/it'

/** First message Zod produces for a value, or undefined when it parses. */
function messageFor(
  schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: { message: string }[] } } },
  value: unknown,
): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error?.issues[0]?.message
}

// Zod's built-in messages are English ("Invalid email"), and they reach the user
// verbatim: applyFieldErrors prints them into the field slots. Every message the
// form can emit has to come from the dictionary instead — that is the whole
// point of these field contracts, and nothing else in the suite would notice a
// field quietly falling back to the default.
describe('validation messages come from the dictionary', () => {
  it('reports an invalid email in the site language', () => {
    expect(messageFor(emailField, 'not-an-email')).toBe(dictionary['forms.error.emailInvalid'])
  })

  it('reports an over-long email in the site language', () => {
    expect(messageFor(emailField, `${'a'.repeat(250)}@example.com`)).toBe(dictionary['forms.error.emailTooLong'])
  })

  it('reports a refused consent in the site language', () => {
    expect(messageFor(consentField, false)).toBe(dictionary['forms.error.consentRequired'])
  })

  it('carries its message through both the missing and the empty case', () => {
    const field = requiredText('compila')
    expect(messageFor(field, undefined)).toBe('compila')
    expect(messageFor(field, '')).toBe('compila')
    // `.trim()` runs first, so whitespace is empty — the user typed nothing.
    expect(messageFor(field, '   ')).toBe('compila')
  })
})

// [HARD] Parity with the markup: a field carrying `required` must fail here on
// an empty submit. The form is novalidate, so nothing else enforces it.
describe('required parity with the markup', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    message: 'Ciao',
    consent: true,
  } as const

  it('accepts a complete submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  for (const field of ['firstName', 'lastName', 'email'] as const) {
    it(`rejects an empty ${field}`, () => {
      expect(contactSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false)
    })
  }

  it('rejects a missing consent', () => {
    expect(contactSchema.safeParse({ ...valid, consent: false }).success).toBe(false)
  })

  // The one field the markup leaves optional — the schema has to agree.
  it('accepts an empty message', () => {
    expect(contactSchema.safeParse({ ...valid, message: '' }).success).toBe(true)
  })
})
