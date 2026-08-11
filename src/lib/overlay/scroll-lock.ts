// The lock itself is CSS on `html[data-scroll-locked]` (src/styles/globals.css).

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

export function resetScrollLock(): void {
  locks = 0
  document.documentElement.removeAttribute('data-scroll-locked')
}
