// Client behavior of contact-form.astro: FormData → typed payload → Astro
// Action submit, with success/error feedback. Copy comes from data-i18n-*
// attributes on the form — this module ships no strings.
import { createMotionBinding } from '@/lib/motion'

import { type ContactPayload, submitContactForm } from './form-submit'

function showFeedback(form: HTMLFormElement, kind: 'success' | 'error' | 'none', message?: string): void {
  const success = form.querySelector<HTMLElement>('[data-contact-success]')
  const error = form.querySelector<HTMLElement>('[data-contact-error]')
  success?.classList.toggle('hidden', kind !== 'success')
  error?.classList.toggle('hidden', kind !== 'error')
  if (kind === 'error' && error && message) error.textContent = message
}

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? '')
}

function buildPayload(form: HTMLFormElement): ContactPayload {
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
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  const form = event.currentTarget
  if (!(form instanceof HTMLFormElement)) return

  showFeedback(form, 'none')
  await submitContactForm(form, buildPayload(form), (kind, message) => showFeedback(form, kind, message))
}

function setupContactForm(): void {
  const root = document.querySelector<HTMLElement>('[data-contact-form]')
  if (!root || !(root instanceof HTMLFormElement)) return
  root.addEventListener('submit', handleSubmit)
}

function cleanupContactForm(): void {
  const root = document.querySelector<HTMLElement>('[data-contact-form]')
  root?.removeEventListener('submit', handleSubmit)
}

export const bindContactForm = createMotionBinding(setupContactForm, cleanupContactForm)
