import { isInputError } from 'astro:actions'

import { createMotionBinding } from '@/lib/motion'

import { applyFieldErrors, clearFieldErrors, focusFirstInvalid } from './field-errors'

type ActionSubmit<P> = (payload: P) => Promise<{ error?: unknown }>

function submitLabel(form: HTMLFormElement, pending: boolean): string {
  return (pending ? form.dataset.i18nSending : form.dataset.i18nSubmit) ?? ''
}

function setPending(form: HTMLFormElement, pending: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  /* v8 ignore next -- every action form the template renders carries a submit button */
  if (!submit) return
  submit.disabled = pending
  submit.textContent = submitLabel(form, pending)
}

function messageOf(form: HTMLFormElement, error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return form.dataset.i18nGenericError
}

// A screen reader reads a message twice when both the field slot and the
// form-level alert carry it, so the alert speaks only for what found no slot.
function reportError(form: HTMLFormElement, error: unknown): void {
  if (!isInputError(error)) {
    showFeedback(form, 'error', messageOf(form, error))
    return
  }
  const { matched, unmatched } = applyFieldErrors(form, error.fields)
  focusFirstInvalid(form)
  if (matched && unmatched.length === 0) return
  /* v8 ignore next -- reached only if applyFieldErrors matched nothing AND collected nothing, which its own contract excludes */
  showFeedback(form, 'error', unmatched[0] ?? form.dataset.i18nGenericError)
}

function showFeedback(form: HTMLFormElement, kind: 'success' | 'error' | 'none', message?: string): void {
  const success = form.querySelector<HTMLElement>('[data-form-success]')
  const error = form.querySelector<HTMLElement>('[data-form-error]')
  success?.classList.toggle('hidden', kind !== 'success')
  error?.classList.toggle('hidden', kind !== 'error')
  if (kind === 'error' && error && message) error.textContent = message
}

async function submitActionForm<P>(form: HTMLFormElement, payload: P, submit: ActionSubmit<P>): Promise<void> {
  setPending(form, true)
  const { error } = await submit(payload)
  setPending(form, false)

  if (!error) {
    form.reset()
    clearFieldErrors(form)
    showFeedback(form, 'success')
    return
  }
  reportError(form, error)
}

export function createActionFormBinding<P>(config: {
  formSelector: string
  buildPayload: (form: HTMLFormElement) => P
  submit: ActionSubmit<P>
}): () => void {
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    /* v8 ignore next -- the listener is bound to the form, so currentTarget is always it */
    if (!(form instanceof HTMLFormElement)) return
    showFeedback(form, 'none')
    clearFieldErrors(form)
    await submitActionForm(form, config.buildPayload(form), config.submit)
  }

  function setup(): void {
    for (const form of document.querySelectorAll<HTMLFormElement>(config.formSelector)) {
      form.addEventListener('submit', handleSubmit)
    }
  }

  function cleanup(): void {
    for (const form of document.querySelectorAll<HTMLFormElement>(config.formSelector)) {
      form.removeEventListener('submit', handleSubmit)
    }
  }

  return createMotionBinding(setup, cleanup)
}
