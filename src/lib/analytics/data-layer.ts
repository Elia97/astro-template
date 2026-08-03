// Shared GTM dataLayer bridge. The GTM container that reads this array is gated
// behind consent (src/lib/analytics/bootstrap.ts); until it loads, pushes queue
// harmlessly on a plain array — the standard GTM snippet contract. SSR-safe:
// no-op off the client.

export type DataLayerEvent = Record<string, unknown>

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[]
  }
}

export function pushToDataLayer(event: DataLayerEvent): void {
  if (typeof window === 'undefined') return
  const queue = window.dataLayer ?? []
  queue.push(event)
  window.dataLayer = queue
}
