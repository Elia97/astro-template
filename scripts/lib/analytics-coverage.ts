import type { Trigger } from './gtm-container.ts'

export type LinkEvent = { prefix: string; event: string }

export type Coverage = { event: string; prefix: string; covered: boolean }

const LINK_EVENT = /startsWith\('([^']+)'\)\)\s*return\s*'([^']+)'/g

// Read off the source of src/lib/analytics/link-tracking.ts rather than restated here: the
// two lists drift the day someone adds a scheme, and nothing would fail.
export function extractLinkEvents(source: string): LinkEvent[] {
  /* v8 ignore next 2 -- both groups always participate when LINK_EVENT matches at all */
  return [...source.matchAll(LINK_EVENT)].map(([, prefix, event]) => ({
    prefix: prefix ?? '',
    event: event ?? '',
  }))
}

export function coverageOf(events: readonly LinkEvent[], triggers: readonly Trigger[]): Coverage[] {
  const fired = new Set(triggers.map(({ eventName }) => eventName))
  return events.map(({ event, prefix }) => ({ event, prefix, covered: fired.has(event) }))
}
