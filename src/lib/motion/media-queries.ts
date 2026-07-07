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

/** Desktop viewport (≥ 768px). Optional gate for heavy effects. SSR-safe. */
export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(min-width: 768px)').matches
}

/** Fine pointer + real hover (no tilt/parallax on touch). SSR-safe. */
export function hasFinePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
