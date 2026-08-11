// Per-instance state: it resets on cold starts and isn't shared across serverless
// instances — a base anti-abuse layer, not a quota (docs/guides/forms-email.md).
const WINDOW_MS = 60_000
const MAX_HITS = 5
const hits = new Map<string, number[]>()

// [HARD] Sweep the map: under Fluid Compute one instance serves many requests, so
// rotating IPs grow it unbounded with no error to show for it.
const MAX_TRACKED_KEYS = 5_000

function sweepExpired(now: number, windowMs: number): void {
  for (const [key, timestamps] of hits) {
    const newest = timestamps[timestamps.length - 1]
    if (newest === undefined || now - newest >= windowMs) hits.delete(key)
  }
}

export function rateLimit(key: string, max = MAX_HITS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  if (hits.size > MAX_TRACKED_KEYS) sweepExpired(now, windowMs)
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

export function resetRateLimit(): void {
  hits.clear()
}

/** The sweep is invisible to allow/deny — only the map size tells the two apart. */
export function trackedKeyCount(): number {
  return hits.size
}
