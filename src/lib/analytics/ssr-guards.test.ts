// Deliberately NOT happy-dom: these guards exist for the server, where `window`
// genuinely does not exist. Faking it in a DOM environment would stop proving
// the thing that matters — that importing these modules during a build, or
// rendering a page that pulls them in, cannot throw.
import { describe, expect, it } from 'vitest'

describe('analytics modules are importable without a window', () => {
  it('pushToDataLayer no-ops instead of throwing', async () => {
    const { pushToDataLayer } = await import('@/lib/analytics/data-layer')

    expect(() => {
      pushToDataLayer({ event: 'test' })
    }).not.toThrow()
  })

  // The module registers a matchMedia listener at import time; without the guard
  // the import itself would throw during SSR.
  it('the reveal module imports cleanly', async () => {
    await expect(import('@/lib/motion/reveal')).resolves.toBeDefined()
  })
})
