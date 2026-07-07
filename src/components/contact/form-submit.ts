// Submit helper over Astro Actions: pending label on the submit button,
// field-level error extraction via isInputError, reset on success. The
// payload type derives from the action itself — schema changes propagate.
import { actions, isInputError } from 'astro:actions'

export type ContactPayload = Parameters<typeof actions.contact>[0]
type ContactError = NonNullable<Awaited<ReturnType<typeof actions.contact>>['error']>

function submitLabel(form: HTMLFormElement, pending: boolean): string {
  return (pending ? form.dataset.i18nSending : form.dataset.i18nSubmit) ?? ''
}

function setPending(form: HTMLFormElement, pending: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (!submit) return
  submit.disabled = pending
  submit.textContent = submitLabel(form, pending)
}

function firstErrorMessage(form: HTMLFormElement, error: ContactError): string | undefined {
  if (isInputError(error)) return Object.values(error.fields)[0]?.[0] ?? form.dataset.i18nGenericError
  return error.message
}

export async function submitContactForm(
  form: HTMLFormElement,
  payload: ContactPayload,
  notify: (kind: 'success' | 'error', message?: string) => void,
): Promise<void> {
  setPending(form, true)
  const { error } = await actions.contact(payload)
  setPending(form, false)

  if (!error) {
    form.reset()
    notify('success')
    return
  }
  notify('error', firstErrorMessage(form, error))
}
