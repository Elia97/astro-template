import { lockScroll, unlockScroll } from '@/lib/overlay/scroll-lock'
import { cycleFocus } from '@/lib/overlay/trap-focus'

import { createMotionBinding } from './binding'
import { onDesktopViewportChange } from './media-queries'

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'

let isOpen = false
let lastFocused: HTMLElement | null = null
const cleanups: Array<() => void> = []

function focusableElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null,
  )
}

// `aria-modal` is advisory: a screen reader's virtual cursor still swipes into the
// page underneath, and the Tab trap never notices because no focus moves.
function setBackgroundInert(panel: HTMLElement, inert: boolean): void {
  for (const sibling of Array.from(document.body.children)) {
    if (sibling === panel || !(sibling instanceof HTMLElement)) continue
    sibling.inert = inert
  }
}

function openMenu(panel: HTMLElement, toggle: HTMLButtonElement): void {
  /* v8 ignore next -- document.activeElement is <body> at worst, never a non-element */
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  panel.hidden = false
  toggle.setAttribute('aria-expanded', 'true')
  setBackgroundInert(panel, true)
  lockScroll()
  isOpen = true
  focusableElements(panel)[0]?.focus()
}

function closeMenu(panel: HTMLElement, toggle: HTMLButtonElement): void {
  panel.hidden = true
  toggle.setAttribute('aria-expanded', 'false')
  // Before the focus below: an inert element silently refuses focus.
  setBackgroundInert(panel, false)
  if (isOpen) unlockScroll()
  isOpen = false
  ;(lastFocused ?? toggle).focus()
}

function bindMobileNavHandlers(panel: HTMLElement, toggle: HTMLButtonElement): () => void {
  const onToggleClick = (): void => {
    if (panel.hidden) openMenu(panel, toggle)
    else closeMenu(panel, toggle)
  }

  const onPanelClick = (event: MouseEvent): void => {
    /* v8 ignore next -- delegated from the panel, whose children are all elements */
    if (!(event.target instanceof Element)) return
    if (event.target.closest('a[href], [data-mobile-nav-close]')) closeMenu(panel, toggle)
  }

  const onPanelKeydown = (event: KeyboardEvent): void => {
    if (panel.hidden) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(panel, toggle)
      return
    }
    if (event.key === 'Tab') cycleFocus(focusableElements(panel), event)
  }

  // Panel and toggle are both `md:hidden`, and a phone in landscape crosses the
  // 768px breakpoint (a 14 Pro is 852px wide) with the drawer still locking the page.
  const stopViewportWatch = onDesktopViewportChange((isDesktop) => {
    if (isDesktop && !panel.hidden) closeMenu(panel, toggle)
  })

  toggle.addEventListener('click', onToggleClick)
  panel.addEventListener('click', onPanelClick)
  panel.addEventListener('keydown', onPanelKeydown)

  return () => {
    stopViewportWatch()
    toggle.removeEventListener('click', onToggleClick)
    panel.removeEventListener('click', onPanelClick)
    panel.removeEventListener('keydown', onPanelKeydown)
  }
}

function setupMobileNav(): void {
  const panel = document.querySelector<HTMLElement>('[data-mobile-nav]')
  const toggle = document.querySelector<HTMLButtonElement>('[data-mobile-nav-toggle]')
  // createMotionBinding runs setup twice on a cold load.
  if (!panel || !toggle || panel.dataset.mobileNavReady !== undefined) return
  panel.dataset.mobileNavReady = ''

  panel.hidden = true
  toggle.setAttribute('aria-expanded', 'false')
  cleanups.push(bindMobileNavHandlers(panel, toggle))
}

function cleanupMobileNav(): void {
  for (const cleanup of cleanups.splice(0)) cleanup()
  const panel = document.querySelector<HTMLElement>('[data-mobile-nav]')
  if (panel) {
    delete panel.dataset.mobileNavReady
    panel.hidden = true
    setBackgroundInert(panel, false)
  }
  if (isOpen) unlockScroll()
  isOpen = false
  lastFocused = null
}

export const bindMobileNav = createMotionBinding(setupMobileNav, cleanupMobileNav)
