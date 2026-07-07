// In-memory sliding-window rate limiter. Per-instance state: it resets on
// cold starts and isn't shared across serverless instances — fine as a
// base anti-abuse layer, not a hard quota (docs/guides/forms.md).
const WINDOW_MS = 60_000
const MAX_HITS = 5
const hits = new Map<string, number[]>()

export function rateLimit(key: string, max = MAX_HITS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}
