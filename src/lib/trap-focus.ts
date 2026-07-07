// Tab/Shift+Tab focus trap for dialogs, menus and other overlays: call from
// the container's `keydown` handler with its focusable elements (in DOM
// order) and focus wraps at both ends instead of escaping the overlay.

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
