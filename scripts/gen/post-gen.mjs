// Shared final plop action: regenerate astro:* types, then format and check
// the generated output with the repo's own gate.
//
// FAILS LOUDLY on a non-zero exit (throw → plop reports the action as
// failed): broken generated output must break the generator run, never be
// swallowed — same contract as lefthook and CI.
import { execSync } from 'node:child_process'

export function postGenAction(root) {
  return () => {
    try {
      execSync('pnpm exec astro sync', { cwd: root, stdio: 'inherit' })
      execSync('pnpm run check', { cwd: root, stdio: 'inherit' })
    } catch (error) {
      throw new Error(
        'Post-generation checks failed. The generated files were left on disk — inspect, then fix or delete them before re-running (a re-run against leftovers fails with "File already exists").',
        { cause: error },
      )
    }
    return 'astro sync + biome check passed'
  }
}
