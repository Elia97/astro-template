// Client behavior of contact-form.astro: FormData → typed payload → Astro
// Action submit. The submit lifecycle and feedback live in the shared binder
// (forms/action-submit.ts); this only maps the form's fields to the payload.
import { actions } from 'astro:actions'

import { createActionFormBinding } from '@/components/forms/action-submit'

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? '')
}

export const bindContactForm = createActionFormBinding({
  formSelector: '[data-contact-form]',
  buildPayload: (form) => {
    const data = new FormData(form)
    return {
      firstName: field(data, 'firstName'),
      lastName: field(data, 'lastName'),
      email: field(data, 'email'),
      message: field(data, 'message'),
      // `as true`: the checkbox is `required`, so submit implies checked — the
      // schema's literal(true) still verifies server-side.
      consent: (data.get('consent') === 'on') as true,
    }
  },
  submit: actions.contact,
})
