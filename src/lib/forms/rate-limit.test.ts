import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { rateLimit, resetRateLimit, trackedKeyCount } from '@/lib/forms/rate-limit'

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

// The leak: entries are written per address and never read again. On a reused
// Fluid Compute instance a spam run from rotating IPs grows the map for the life
// of the instance, with no error and no failed request to notice it by.
//
// Asserted on the map size because allow/deny cannot see the difference: the
// per-call filter drops expired timestamps either way.
describe('bounded memory', () => {
  beforeEach(resetRateLimit)
  afterEach(resetRateLimit)

  it('sweeps entries whose window has elapsed once the map grows past its cap', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5_001; i++) rateLimit(`spam:${i}`)
    expect(trackedKeyCount()).toBe(5_001)

    vi.advanceTimersByTime(61_000)
    rateLimit('contact:198.51.100.9')

    expect(trackedKeyCount()).toBe(1)
  })

  it('keeps entries that are still inside their window', () => {
    for (let i = 0; i < 5_001; i++) rateLimit(`live:${i}`)
    rateLimit('contact:198.51.100.10')

    expect(trackedKeyCount()).toBe(5_002)
  })
})
