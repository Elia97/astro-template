/** With `<ClientRouter />`, `astro:page-load` also fires on the initial load, so
 *  `setup` runs twice on a cold load and must be idempotent. */
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
