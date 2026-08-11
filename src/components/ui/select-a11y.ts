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

// select-listbox.astro renders every option `aria-selected="false"` at SSR.
export function markSelectedValue(listbox: HTMLElement, value: string): void {
  const current = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (item) => item.dataset.value === value,
  )
  if (current) markSelectedOption(listbox, current)
}
