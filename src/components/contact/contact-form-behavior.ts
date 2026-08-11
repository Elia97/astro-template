import { actions } from 'astro:actions'

import { createActionFormBinding } from '@/components/forms/action-submit'

import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? '')
}

export const bindContactForm = createActionFormBinding({
  formSelector: '[data-contact-form]',
  buildPayload: (form) => {
    const data = new FormData(form)
    return {
      [HONEYPOT_FIELD]: field(data, HONEYPOT_FIELD),
      firstName: field(data, 'firstName'),
      lastName: field(data, 'lastName'),
      email: field(data, 'email'),
      message: field(data, 'message'),
      consent: (data.get('consent') === 'on') as true,
    }
  },
  submit: actions.contact,
})
