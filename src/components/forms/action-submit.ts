import { isInputError } from 'astro:actions'

import { createMotionBinding } from '@/lib/motion'

import { applyFieldErrors, clearFieldErrors, focusFirstInvalid } from './field-errors'

type ActionSubmit<P> = (payload: P) => Promise<{ error?: unknown }>

function submitLabel(form: HTMLFormElement, pending: boolean): string {
  return (pending ? form.dataset.i18nSending : form.dataset.i18nSubmit) ?? ''
}

function setPending(form: HTMLFormElement, pending: boolean): void {
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
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

/**
 * Validation errors land on their own field (slot text + `aria-invalid`) and
 * focus moves to the first invalid control. The form-level alert then speaks
 * only for what had no slot to land in — repeating a message a field already
 * carries would have a screen reader read it twice.
 */
function reportError(form: HTMLFormElement, error: unknown): void {
  if (!isInputError(error)) {
    showFeedback(form, 'error', messageOf(form, error))
    return
  }
  const { matched, unmatched } = applyFieldErrors(form, error.fields)
  focusFirstInvalid(form)
  if (matched && unmatched.length === 0) return
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

/**
 * Shared submit binder for Astro Action forms. Owns the lifecycle once: pending
 * label swap, `[data-form-success|error]` toggle, reset on success. A per-form
 * module supplies only the selector, a buildPayload, and the action.
 * Idempotent across view transitions (createMotionBinding); querySelectorAll so
 * one page can carry multiple instances of the same form.
 */
export function createActionFormBinding<P>(config: {
  formSelector: string
  buildPayload: (form: HTMLFormElement) => P
  submit: ActionSubmit<P>
}): () => void {
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
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
