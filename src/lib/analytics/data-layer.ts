// The GTM snippet contract: until the container loads it queues on a plain array
// and replays on load, so a push before consent is safe.

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
