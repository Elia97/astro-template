import { afterEach, beforeEach } from 'vitest'

export function withOnlyListedPaths(list: readonly string[], ...paths: string[]): void {
  const entries = list as string[]
  let saved: string[] = []
  beforeEach(() => {
    saved = entries.splice(0, entries.length, ...paths)
  })
  afterEach(() => {
    entries.splice(0, entries.length, ...saved)
  })
}
