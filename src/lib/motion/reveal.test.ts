// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The silent failure this guards: `html.js` is set by an inline script that
// cannot fail, but what actually clears `opacity: 0` is `data-reveal-ready`,
// written by THIS module — which arrives as a network chunk. Without a signal
// that it ran, a chunk that never lands leaves the content invisible forever.
beforeEach(() => {
  vi.resetModules()
  document.documentElement.removeAttribute('data-reveal-active')
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {} }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('reveal module announces itself', () => {
  it('marks the document as soon as it runs', async () => {
    document.body.innerHTML = '<div data-reveal></div>'
    const { bindReveals } = await import('@/lib/motion/reveal')
    bindReveals()

    expect(document.documentElement.hasAttribute('data-reveal-active')).toBe(true)
  })

  it('marks it even with nothing to reveal, since the question is whether the chunk loaded', async () => {
    document.body.innerHTML = '<p>no reveal targets here</p>'
    const { bindReveals } = await import('@/lib/motion/reveal')
    bindReveals()

    expect(document.documentElement.hasAttribute('data-reveal-active')).toBe(true)
  })
})
