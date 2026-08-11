/** [HARD] `prefers-reduced-motion: reduce` disables ALL motion — first line of
 *  every motion setup. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// [HARD] 768px is Tailwind's `md` breakpoint, where the mobile drawer hides itself.
const DESKTOP_QUERY = '(min-width: 768px)'

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

export function onDesktopViewportChange(listener: (isDesktop: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(DESKTOP_QUERY)
  const handler = (event: MediaQueryListEvent): void => listener(event.matches)
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

export function hasFinePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
