import { isInputError } from 'astro:actions'

import { createMotionBinding } from '@/lib/motion'

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

function firstErrorMessage(form: HTMLFormElement, error: unknown): string | undefined {
  if (isInputError(error)) return Object.values(error.fields)[0]?.[0] ?? form.dataset.i18nGenericError
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return form.dataset.i18nGenericError
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
    showFeedback(form, 'success')
    return
  }
  showFeedback(form, 'error', firstErrorMessage(form, error))
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
