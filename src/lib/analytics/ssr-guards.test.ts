// Deliberately NOT happy-dom: a faked window would void what these guards prove.
import { describe, expect, it } from 'vitest'

describe('analytics modules are importable without a window', () => {
  it('pushToDataLayer no-ops instead of throwing', async () => {
    const { pushToDataLayer } = await import('@/lib/analytics/data-layer')

    expect(() => {
      pushToDataLayer({ event: 'test' })
    }).not.toThrow()
  })

  // reveal.ts registers a matchMedia listener at import time.
  it('the reveal module imports cleanly', async () => {
    await expect(import('@/lib/motion/reveal')).resolves.toBeDefined()
  })
})
