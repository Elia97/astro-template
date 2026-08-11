// `focusables` must be in DOM order: the first and last are read as the trap's ends.

function isBackwardWrap(event: KeyboardEvent, active: Element | null, first: HTMLElement): boolean {
  return event.shiftKey && active === first
}

function isForwardWrap(event: KeyboardEvent, active: Element | null, last: HTMLElement): boolean {
  return !event.shiftKey && active === last
}

export function cycleFocus(focusables: HTMLElement[], event: KeyboardEvent): void {
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (isBackwardWrap(event, active, first)) {
    event.preventDefault()
    last.focus()
  } else if (isForwardWrap(event, active, last)) {
    event.preventDefault()
    first.focus()
  }
}
