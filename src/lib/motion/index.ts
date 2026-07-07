// Motion layer barrel — the one stable import point for consumers.
// Internals live in focused modules: binding (bind-once factory),
// media-queries (environment guards), reveal (reveal-on-scroll setup).
export { createMotionBinding } from './binding'
export { hasFinePointer, isDesktopViewport, prefersReducedMotion } from './media-queries'
