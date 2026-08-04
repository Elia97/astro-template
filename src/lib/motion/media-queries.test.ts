// Deliberately NOT happy-dom: these guards exist for the server, where `window`
// genuinely does not exist. Under a DOM environment the SSR branch could only be
// faked, and a fake would stop proving the thing that matters — that importing
// this module during a build cannot throw.
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  hasFinePointer,
  isDesktopViewport,
  onDesktopViewportChange,
  prefersReducedMotion,
} from '@/lib/motion/media-queries'

type Listener = (event: { matches: boolean }) => void

/** Minimal matchMedia whose result and listeners the test drives. */
function stubMatchMedia(matches: boolean): { listeners: Listener[]; removed: number } {
  const state = { listeners: [] as Listener[], removed: 0 }
  vi.stubGlobal('window', {
    matchMedia: (media: string) => ({
      matches,
      media,
      addEventListener: (_: string, listener: Listener) => state.listeners.push(listener),
      removeEventListener: () => {
        state.removed += 1
      },
    }),
  })
  return state
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('without a window (SSR)', () => {
  // The safe default differs per guard, and the direction is the point: motion
  // is off unless proven otherwise, capabilities are absent unless proven present.
  it('assumes reduced motion', () => {
    expect(prefersReducedMotion()).toBe(true)
  })

  it('assumes neither desktop nor a fine pointer', () => {
    expect(isDesktopViewport()).toBe(false)
    expect(hasFinePointer()).toBe(false)
  })

  it('returns a no-op unsubscribe rather than throwing', () => {
    const stop = onDesktopViewportChange(() => {})

    expect(() => {
      stop()
    }).not.toThrow()
  })
})

describe('in a browser', () => {
  it.each([true, false])('reports the media query result (%s)', (matches) => {
    stubMatchMedia(matches)

    expect(prefersReducedMotion()).toBe(matches)
    expect(isDesktopViewport()).toBe(matches)
    expect(hasFinePointer()).toBe(matches)
  })

  it('forwards a breakpoint crossing to the listener', () => {
    const state = stubMatchMedia(false)
    const seen: boolean[] = []

    onDesktopViewportChange((isDesktop) => seen.push(isDesktop))
    for (const listener of state.listeners) listener({ matches: true })

    expect(seen).toEqual([true])
  })

  it('unsubscribes on cleanup, so a re-bind cannot stack listeners', () => {
    const state = stubMatchMedia(false)

    onDesktopViewportChange(() => {})()

    expect(state.removed).toBe(1)
  })
})
