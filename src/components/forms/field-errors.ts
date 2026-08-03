import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// Per-field validation surface, shared by every action-backed form. The markup
// contract is one `<FieldError field="…" />` slot per control, wired to it
// through a static `aria-describedby`; this module only fills the slots and
// flips `aria-invalid`. markup-contract.test.ts guards that the slots in a
// rendered form and the keys of its schema still agree.

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export type FieldErrorResult = {
  /** At least one message landed on a field slot — the alert can stay a summary. */
  matched: boolean
  /** Messages with no slot to land in: the caller surfaces them form-level. */
  unmatched: string[]
}

/** Links a control's `aria-describedby` to its error slot. One function so the
 *  two ends can't drift apart. */
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

/**
 * Maps each `error.fields` entry onto its own slot. The honeypot is dropped
 * rather than reported: surfacing its error would tell a bot which field gave
 * it away (docs/guides/forms-email.md § Abuse protection).
 */
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

/** First invalid control in DOM order — not in `error.fields` key order, which
 *  would send focus somewhere the reader hasn't reached yet. */
export function focusFirstInvalid(form: HTMLFormElement): boolean {
  const control = form.querySelector<FormControl>('[aria-invalid="true"]')
  if (!control) return false
  control.focus()
  return true
}
