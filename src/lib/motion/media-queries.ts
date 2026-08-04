// Environment guards for motion code. Leaf layer: no imports from the
// rendering tree. Import via the '@/lib/motion' barrel.

/**
 * [HARD] `prefers-reduced-motion: reduce` disables ALL motion.
 * First line of every motion setup. SSR-safe.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// [HARD] Keep in sync with Tailwind's `md:` — components that hide themselves at
// that breakpoint (the mobile drawer and its toggle) rely on this query to know
// when they stopped being reachable.
const DESKTOP_QUERY = '(min-width: 768px)'

/** Desktop viewport (≥ 768px). Optional gate for heavy effects. SSR-safe. */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

/**
 * Fires whenever the viewport crosses the desktop breakpoint, in either
 * direction. Returns its own cleanup. SSR-safe: a no-op without a window.
 */
export function onDesktopViewportChange(listener: (isDesktop: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia(DESKTOP_QUERY)
  const handler = (event: MediaQueryListEvent): void => listener(event.matches)
  query.addEventListener('change', handler)
  return () => query.removeEventListener('change', handler)
}

/** Fine pointer + real hover (no tilt/parallax on touch). SSR-safe. */
export function hasFinePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
