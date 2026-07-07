// Reference-counted scroll lock: overlays (mobile menu, dialogs) can nest
// without stealing each other's unlock. The actual locking is pure CSS on
// `html[data-scroll-locked]` (globals.css) — `overflow: hidden` plus
// `scrollbar-gutter: stable` so the page doesn't shift when the bar vanishes.

let locks = 0

export function lockScroll(): void {
  locks += 1
  if (locks > 1) return
  document.documentElement.setAttribute('data-scroll-locked', '')
}

export function unlockScroll(): void {
  if (locks === 0) return
  locks -= 1
  if (locks > 0) return
  document.documentElement.removeAttribute('data-scroll-locked')
}

/**
 * Drop every lock at once. For `astro:after-swap`: overlays don't survive a
 * view transition, so their pending locks must not leak into the next page.
 */
export function resetScrollLock(): void {
  locks = 0
  document.documentElement.removeAttribute('data-scroll-locked')
}
