// BIND-ONCE factory for per-component effects.
// Keeps the system leak-free with view transitions (`<ClientRouter />`):
// lifecycle listeners are registered exactly ONCE even if the component's
// <script> re-runs when it reappears after a navigation.
// Leaf layer: no imports from the rendering tree.

/**
 * Wraps a setup/cleanup pair into an idempotent binder.
 *
 * - `setup()` runs IMMEDIATELY on the first <script> execution, and with
 *   `<ClientRouter />` active `astro:page-load` ALSO fires on the initial page
 *   load — so setup can run twice on a cold load and MUST be idempotent.
 * - The `bound` guard registers the listeners exactly once.
 * - `astro:page-load` → `setup` re-applies the effect on the new DOM after the swap.
 * - `astro:before-swap` → `cleanup` tears down BEFORE the swap: this prevents the leak.
 */
export function createMotionBinding(setup: () => void, cleanup: () => void): () => void {
  let bound = false
  return (): void => {
    setup()
    if (bound) return
    bound = true
    document.addEventListener('astro:page-load', setup)
    document.addEventListener('astro:before-swap', cleanup)
  }
}
