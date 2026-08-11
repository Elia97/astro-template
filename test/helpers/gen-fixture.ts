// Hook points are copied from the real repo, never transcribed: a frozen copy is a
// green test over a generator broken by a rename or a dropped `@gen:` marker.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

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
