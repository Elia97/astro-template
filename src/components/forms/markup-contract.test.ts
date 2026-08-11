import { renderToFragment } from '@test/container'
import { describe, expect, it } from 'vitest'

import ContactFormFields from '@/components/contact/contact-form-fields.astro'

import { contactSchema } from '@/lib/contact'
import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

import { fieldErrorId } from './field-errors'

// A slot missing or renamed against the schema compiles fine and silently degrades
// the field error to a form-level message.
const WITHOUT_SLOT: readonly string[] = [HONEYPOT_FIELD]

const expectedFields = Object.keys(contactSchema.shape).filter((field) => !WITHOUT_SLOT.includes(field))

describe('contact form markup contract', () => {
  it('covers every schema field with a slot, and adds none of its own', async () => {
    const document = await renderToFragment(ContactFormFields)
    const slots = [...document.querySelectorAll('[data-field-error]')].map((el) => el.getAttribute('data-field-error'))
    expect(slots.sort()).toEqual([...expectedFields].sort())
  })

  it('points each control at its own slot through aria-describedby', async () => {
    const document = await renderToFragment(ContactFormFields)
    for (const field of expectedFields) {
      const control = document.querySelector(`[name="${field}"]`)
      expect(control, `no control named ${field}`).not.toBeNull()
      expect(control?.getAttribute('aria-describedby')).toBe(fieldErrorId(field))
    }
  })

  it('gives every slot the id its control references', async () => {
    const document = await renderToFragment(ContactFormFields)
    for (const field of expectedFields) {
      expect(document.querySelector(`#${fieldErrorId(field)}`)?.getAttribute('data-field-error')).toBe(field)
    }
  })

  it('renders the honeypot without a slot to give it away', async () => {
    const document = await renderToFragment(ContactFormFields)
    expect(document.querySelector(`[name="${HONEYPOT_FIELD}"]`)).not.toBeNull()
    expect(document.querySelector(`[data-field-error="${HONEYPOT_FIELD}"]`)).toBeNull()
  })
})
