// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ObserverCallback = (entries: unknown[], self: { unobserve: (t: Element) => void }) => void

interface FakeObserver {
  callback: ObserverCallback
  rootMargin: string | undefined
  observed: Element[]
  unobserved: Element[]
  disconnected: boolean
}

let observers: FakeObserver[] = []
let mediaListeners: Array<(event: { matches: boolean }) => void> = []
// Mutable so a test can flip the preference WITHOUT reinstalling the stubs,
// which would drop the very listener it needs to fire.
let reducedMotion = false

/** The primary observer carries a rootMargin; the no-margin one is the fallback. */
const primary = (): FakeObserver => observers.find((o) => o.rootMargin) as FakeObserver
const fallback = (): FakeObserver => observers.find((o) => !o.rootMargin) as FakeObserver

function installEnvironment({ reduced = false } = {}): void {
  observers = []
  mediaListeners = []
  reducedMotion = reduced
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      self: FakeObserver
      constructor(callback: ObserverCallback, options?: { rootMargin?: string }) {
        this.self = { callback, rootMargin: options?.rootMargin, observed: [], unobserved: [], disconnected: false }
        observers.push(this.self)
      }
      observe(target: Element) {
        this.self.observed.push(target)
      }
      unobserve(target: Element) {
        this.self.unobserved.push(target)
      }
      disconnect() {
        this.self.disconnected = true
      }
    },
  )
  vi.stubGlobal('matchMedia', (media: string) => ({
    get matches() {
      return reducedMotion
    },
    media,
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => mediaListeners.push(listener),
    removeEventListener: () => {},
  }))
}

/** Geometry the module reads. maxScrollY is 0, so the reveal line is 0.85×innerHeight. */
function withGeometry(topOf: Record<string, number>): void {
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true })
  for (const [selector, top] of Object.entries(topOf)) {
    const el = document.querySelector(selector)
    if (el) el.getBoundingClientRect = () => ({ top }) as DOMRect
  }
}

async function bind(): Promise<void> {
  const { bindReveals } = await import('@/lib/motion/reveal')
  bindReveals()
}

beforeEach(() => {
  vi.resetModules()
  document.documentElement.removeAttribute('data-reveal-active')
  installEnvironment()
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

// The silent failure this guards: `html.js` is set by an inline script that
// cannot fail, but what actually clears `opacity: 0` is `data-reveal-ready`,
// written by THIS module — which arrives as a network chunk. Without a signal
// that it ran, a chunk that never lands leaves the content invisible forever.
describe('announcing itself', () => {
  it('marks the document as soon as it runs', async () => {
    document.body.innerHTML = '<div data-reveal></div>'
    await bind()

    expect(document.documentElement.hasAttribute('data-reveal-active')).toBe(true)
  })

  it('marks it even with nothing to reveal, since the question is whether the chunk loaded', async () => {
    document.body.innerHTML = '<p>no reveal targets here</p>'
    await bind()

    expect(document.documentElement.hasAttribute('data-reveal-active')).toBe(true)
    expect(observers).toHaveLength(0)
  })

  it('observes nothing when the visitor asked for reduced motion', async () => {
    installEnvironment({ reduced: true })
    document.body.innerHTML = '<div data-reveal></div>'
    await bind()

    expect(observers).toHaveLength(0)
  })
})

describe('choosing an observer per element', () => {
  it('sends an ordinary element to the margin observer', async () => {
    document.body.innerHTML = '<div id="a" data-reveal></div>'
    withGeometry({ '#a': 0 })
    await bind()

    expect(primary().observed).toHaveLength(1)
    expect(fallback().observed).toHaveLength(0)
  })

  // An element that can never cross the shrunk boundary — the bottom ~15% of the
  // page at max scroll — would stay hidden forever on the primary observer.
  it('sends an element past the reveal line to the no-margin fallback', async () => {
    document.body.innerHTML = '<div id="b" data-reveal></div>'
    withGeometry({ '#b': 900 })
    await bind()

    expect(fallback().observed).toHaveLength(1)
    expect(primary().observed).toHaveLength(0)
  })
})

describe('revealing on intersection', () => {
  it('marks an intersecting element ready and stops watching it', async () => {
    document.body.innerHTML = '<div id="a" data-reveal></div>'
    withGeometry({ '#a': 0 })
    await bind()
    const target = document.querySelector('#a') as Element
    const observer = primary()

    observer.callback([{ isIntersecting: true, target }], { unobserve: (t) => observer.unobserved.push(t) })

    expect(target.hasAttribute('data-reveal-ready')).toBe(true)
    expect(observer.unobserved).toContain(target)
  })

  it('leaves an element that has not entered the viewport alone', async () => {
    document.body.innerHTML = '<div id="a" data-reveal></div>'
    withGeometry({ '#a': 0 })
    await bind()
    const target = document.querySelector('#a') as Element
    const observer = primary()

    observer.callback([{ isIntersecting: false, target }], { unobserve: () => {} })

    expect(target.hasAttribute('data-reveal-ready')).toBe(false)
  })
})

describe('teardown and re-arm', () => {
  // A live observer would keep pointing at DOM the swap has already replaced.
  it('disconnects both observers on astro:before-swap', async () => {
    document.body.innerHTML = '<div id="a" data-reveal></div><div id="b" data-reveal></div>'
    withGeometry({ '#a': 0, '#b': 900 })
    await bind()

    document.dispatchEvent(new Event('astro:before-swap'))

    expect(primary().disconnected).toBe(true)
    expect(fallback().disconnected).toBe(true)
  })

  // Turning reduced-motion OFF mid-session starts the CSS gate hiding elements
  // that no observer is watching — something has to arm them again.
  it('re-arms when the visitor turns reduced motion off', async () => {
    installEnvironment({ reduced: true })
    document.body.innerHTML = '<div id="a" data-reveal></div>'
    await bind()
    expect(observers).toHaveLength(0)

    reducedMotion = false
    withGeometry({ '#a': 0 })
    for (const listener of mediaListeners) listener({ matches: false })

    expect(observers.length).toBeGreaterThan(0)
  })

  it('ignores the change when reduced motion is turned on', async () => {
    document.body.innerHTML = '<div id="a" data-reveal></div>'
    withGeometry({ '#a': 0 })
    await bind()
    const before = observers.length

    reducedMotion = true
    for (const listener of mediaListeners) listener({ matches: true })

    expect(observers).toHaveLength(before)
  })
})
