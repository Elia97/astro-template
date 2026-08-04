// Accessibility wiring for ui/select.astro: who names the visible control, what
// describes it, and which option reads as current. Pure DOM helpers, no state —
// the interaction lives in ./select-behavior.ts.

/**
 * `<FieldLabel for="topic">` and `aria-describedby` both address the NATIVE by
 * id. The moment the native leaves the accessibility tree those references name
 * nothing: the visible control announces as a bare "button", clicking the label
 * does nothing, and the field error is never read on the element the user is on.
 * So the trigger adopts them. `name` stays on the native, which is still what
 * submits and validates.
 */
export function adoptNativeRelationships(
  native: HTMLSelectElement,
  trigger: HTMLButtonElement,
  listbox: HTMLElement,
): void {
  const id = native.getAttribute('id')
  if (id) {
    native.removeAttribute('id')
    trigger.id = id
    listbox.id = `${id}-listbox`
    trigger.setAttribute('aria-controls', listbox.id)
  }
  const describedBy = native.getAttribute('aria-describedby')
  if (describedBy) {
    native.removeAttribute('aria-describedby')
    trigger.setAttribute('aria-describedby', describedBy)
  }
  if (native.required) trigger.setAttribute('aria-required', 'true')
  trigger.disabled = native.disabled
}

export function markSelectedOption(listbox: HTMLElement | null, option: HTMLElement): void {
  /* v8 ignore next -- every caller passes the listbox findSelectElements resolved */
  for (const item of listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? []) {
    item.setAttribute('aria-selected', String(item === option))
  }
}

/**
 * Options render `aria-selected="false"` for SSR. Without this a pre-selected
 * value reads as "not selected" until the user picks something, and opening the
 * listbox has no current option to focus.
 */
export function markSelectedValue(listbox: HTMLElement, value: string): void {
  const current = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (item) => item.dataset.value === value,
  )
  if (current) markSelectedOption(listbox, current)
}
