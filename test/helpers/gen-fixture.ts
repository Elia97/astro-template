// Throwaway repo trees for the scripts/gen/* injection tests.
//
// The hook-point files are COPIED FROM THE REAL REPO, never transcribed here: a
// frozen copy would keep these tests green after someone renames
// `homepageCollectionSchema` or drops a `@gen:` marker, while the generator
// breaks for real. Tests that need a broken hook point override one explicitly.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** Everything the two injectors read. Copied verbatim into each throwaway root. */
const HOOK_POINTS = [
  'src/lib/schemas/homepage/index.ts',
  'src/lib/homepage.ts',
  'src/pages/index.astro',
  'src/content.config.ts',
] as const

const roots: string[] = []

function write(root: string, rel: string, content: string): void {
  const target = join(root, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

/**
 * A temp root holding the real hook points. `overrides` replaces a file's
 * content, or deletes it when the value is `null`.
 */
export function makeRoot(overrides: Record<string, string | null> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'gen-fixture-'))
  roots.push(root)
  for (const rel of HOOK_POINTS) {
    write(root, rel, readFileSync(join(process.cwd(), rel), 'utf8'))
  }
  for (const [rel, content] of Object.entries(overrides)) {
    if (content === null) rmSync(join(root, rel), { force: true })
    else write(root, rel, content)
  }
  return root
}

export function read(root: string, rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/** Call from afterEach: temp trees outlive the process otherwise. */
export function cleanupRoots(): void {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
}
