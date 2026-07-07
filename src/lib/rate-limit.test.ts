import { afterEach, describe, expect, it, vi } from 'vitest'

import { rateLimit } from '@/lib/rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows up to the default 5 hits then blocks the 6th within the window', () => {
    const key = 'contact:198.51.100.1'
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key)).toBe(true)
    }
    expect(rateLimit(key)).toBe(false)
  })

  it('allows again once the window has elapsed', () => {
    vi.useFakeTimers()
    const key = 'contact:198.51.100.2'
    for (let i = 0; i < 5; i++) rateLimit(key)
    expect(rateLimit(key)).toBe(false)

    vi.advanceTimersByTime(60_001)
    expect(rateLimit(key)).toBe(true)
  })

  it('tracks distinct keys independently', () => {
    const a = 'contact:198.51.100.3'
    const b = 'contact:198.51.100.9'
    for (let i = 0; i < 5; i++) rateLimit(a)
    expect(rateLimit(a)).toBe(false)
    expect(rateLimit(b)).toBe(true)
  })

  it('honours a custom max', () => {
    const key = 'contact:198.51.100.4'
    expect(rateLimit(key, 1)).toBe(true)
    expect(rateLimit(key, 1)).toBe(false)
  })
})
