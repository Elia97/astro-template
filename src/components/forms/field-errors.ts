import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// Fills the `[data-field-error]` slots rendered by ui/field/error.astro.

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export type FieldErrorResult = {
  matched: boolean
  unmatched: string[]
}

export function fieldErrorId(field: string): string {
  return `${field}-error`
}

function controlFor(form: HTMLFormElement, name: string): FormControl | null {
  return form.querySelector<FormControl>(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`)
}

export function clearFieldErrors(form: HTMLFormElement): void {
  for (const slot of form.querySelectorAll<HTMLElement>('[data-field-error]')) slot.textContent = ''
  for (const control of form.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid')
}

// Surfacing the honeypot error tells a bot which field gave it away, so it is dropped.
export function applyFieldErrors(
  form: HTMLFormElement,
  fields: Readonly<Record<string, string[] | undefined>>,
): FieldErrorResult {
  const result: FieldErrorResult = { matched: false, unmatched: [] }
  for (const [name, messages] of Object.entries(fields)) {
    const message = messages?.[0]
    if (!message || name === HONEYPOT_FIELD) continue
    const slot = form.querySelector<HTMLElement>(`[data-field-error="${name}"]`)
    if (!slot) {
      result.unmatched.push(message)
      continue
    }
    slot.textContent = message
    result.matched = true
    controlFor(form, name)?.setAttribute('aria-invalid', 'true')
  }
  return result
}

export function focusFirstInvalid(form: HTMLFormElement): boolean {
  const control = form.querySelector<FormControl>('[aria-invalid="true"]')
  if (!control) return false
  control.focus()
  return true
}
