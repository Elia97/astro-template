// In-memory sliding-window rate limiter. Per-instance state: it resets on
// cold starts and isn't shared across serverless instances — fine as a
// base anti-abuse layer, not a hard quota (docs/guides/forms-email.md).
const WINDOW_MS = 60_000
const MAX_HITS = 5
const hits = new Map<string, number[]>()

// [HARD] The map has to be swept. Every distinct address adds an entry that is
// never read again, and under Fluid Compute an instance is reused across many
// requests — so a spam run from rotating IPs grows it without bound for the life
// of the instance. Nothing surfaces: no error, no failed request, just an
// instance using more memory until the platform recycles it.
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

/** Test seam: the module-level map would otherwise leak state between cases. */
export function resetRateLimit(): void {
  hits.clear()
}

/**
 * Test seam. The sweep is deliberately invisible to behaviour — the per-call
 * filter already discards expired timestamps, so allow/deny is identical with or
 * without it. Only the map's size tells the two apart, which makes this the one
 * way to keep the fix honest.
 */
export function trackedKeyCount(): number {
  return hits.size
}
