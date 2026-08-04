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

// `aria-modal` is advisory: on its own a screen reader's virtual cursor still
// swipes past the last nav item into the page underneath, and the Tab trap never
// notices because no focus ever moves. `inert` is what actually removes the rest
// of the document — for pointer, focus and assistive tech alike.
function setBackgroundInert(panel: HTMLElement, inert: boolean): void {
  for (const sibling of Array.from(document.body.children)) {
    if (sibling === panel || !(sibling instanceof HTMLElement)) continue
    sibling.inert = inert
  }
}

function openMenu(panel: HTMLElement, toggle: HTMLButtonElement): void {
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
  // Before the focus call below: the toggle lives in the inert subtree, and an
  // inert element silently refuses focus.
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

  // A single delegated click handles both the explicit close button and any
  // nav/CTA link: closing on link-click keeps the panel from covering the
  // page the router is about to swap in.
  const onPanelClick = (event: MouseEvent): void => {
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

  // The panel and its toggle are both `md:hidden`. Crossing to desktop while the
  // drawer is open leaves `isOpen` true, the scroll lock on and the background
  // inert — with every control that could undo it now display:none. The page is
  // frozen and the only way out is a reload. Rotating a phone to landscape is
  // enough: a 14 Pro is 852px wide.
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
  // Already-bound panel must not be double-wired: setup re-runs on the
  // initial load (see createMotionBinding's contract).
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
  // Overlays don't survive a view transition: drop the lock and the inert flags
  // so neither leaks into the next page.
  if (isOpen) unlockScroll()
  isOpen = false
  lastFocused = null
}

export const bindMobileNav = createMotionBinding(setupMobileNav, cleanupMobileNav)
