// Shared final plop action: regenerate astro:* types, then format and check
// the generated output with the repo's own gate.
//
// FAILS LOUDLY on a non-zero exit (throw → plop reports the action as
// failed): broken generated output must break the generator run, never be
// swallowed — same contract as lefthook and CI.
//
// `pnpm run check` is `biome check --write .` — repo-wide, so it reformats any
// unrelated dirty file too. Harmless (the pre-commit hook would do the same) but
// it means a generator run is not confined to the files it generated: recovery
// hints must never reach for a whole-file `git checkout`.
import { execSync } from 'node:child_process'

export function postGenAction(root, recoveryHint) {
  return () => {
    try {
      execSync('pnpm exec astro sync', { cwd: root, stdio: 'inherit' })
      execSync('pnpm run check', { cwd: root, stdio: 'inherit' })
    } catch (error) {
      throw new Error(
        `Post-generation checks failed. ${
          recoveryHint ??
          'The generated files were left on disk — inspect, then fix or delete them before re-running (a re-run against leftovers fails with "File already exists").'
        }`,
        { cause: error },
      )
    }
    return 'astro sync + biome check passed'
  }
}
