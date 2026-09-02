import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { coverageOf, extractLinkEvents } from './analytics-coverage'

const trigger = (eventName: string) => ({
  eventName,
  firesOn: [],
  selectors: [],
  urlContains: [],
  unsupported: [],
})

describe('extractLinkEvents', () => {
  it('reads the schemes and events out of the real link-tracking source', () => {
    const events = extractLinkEvents(readFileSync('src/lib/analytics/link-tracking.ts', 'utf8'))

    expect(events).toEqual([
      { prefix: 'tel:', event: 'click_to_call' },
      { prefix: 'mailto:', event: 'click_to_email' },
    ])
  })

  it('finds nothing in a source that pushes no link event', () => {
    expect(extractLinkEvents('export const x = 1')).toEqual([])
  })
})

describe('coverageOf', () => {
  it('marks an event covered only when a trigger fires on it', () => {
    const events = [
      { prefix: 'tel:', event: 'click_to_call' },
      { prefix: 'mailto:', event: 'click_to_email' },
    ]

    expect(coverageOf(events, [trigger('click_to_call')])).toEqual([
      { event: 'click_to_call', prefix: 'tel:', covered: true },
      { event: 'click_to_email', prefix: 'mailto:', covered: false },
    ])
  })

  it('covers nothing when the container has no trigger at all', () => {
    expect(coverageOf([{ prefix: 'tel:', event: 'click_to_call' }], [])).toEqual([
      { event: 'click_to_call', prefix: 'tel:', covered: false },
    ])
  })
})
