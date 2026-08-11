import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cspIntegration } from '@/lib/csp/integration'

// Exercised against a real directory rather than a mocked fs: what this hook has to
// get right is the walk and the write-back, and a mock would assert the mock.

let root = ''

function buildOutput(files: Record<string, string>): URL {
  root = mkdtempSync(join(tmpdir(), 'csp-'))
  for (const [name, html] of Object.entries(files)) {
    const full = join(root, name)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, html)
  }
  return pathToFileURL(`${root}/`)
}

const read = (name: string): string => readFileSync(join(root, name), 'utf8')

function run(dir: URL): { info: ReturnType<typeof vi.fn> } {
  const info = vi.fn()
  const hook = cspIntegration().hooks['astro:build:done']
  if (!hook)
    throw new Error('the integration declares no astro:build:done hook')
    // The hook takes the full Astro payload; only `dir` and `logger` are read here.
  ;(hook as unknown as (options: { dir: URL; logger: { info: (m: string) => void } }) => void)({
    dir,
    logger: { info },
  })
  return { info }
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = ''
})

describe('cspIntegration', () => {
  it('injects the meta into every page, recursing into subdirectories', () => {
    const dir = buildOutput({
      'index.html': '<head><meta charset="utf-8"></head>',
      'nested/deep/page.html': '<head><meta charset="utf-8"></head>',
      'asset.css': 'body{}',
    })

    const { info } = run(dir)

    expect(read('index.html')).toContain('http-equiv="Content-Security-Policy"')
    expect(read('nested/deep/page.html')).toContain('http-equiv="Content-Security-Policy"')
    expect(read('asset.css')).toBe('body{}')
    expect(info).toHaveBeenCalledWith(expect.stringContaining('2/2 pages'))
  })

  it('gives every page the union of the hashes, not just its own', () => {
    // ClientRouter swaps the head, not the policy: the meta CSP of the page loaded
    // first governs the whole session.
    const dir = buildOutput({
      'a.html': '<head><meta charset="utf-8"><script>a=1</script></head>',
      'b.html': '<head><meta charset="utf-8"><script>b=2</script></head>',
    })

    run(dir)

    const scriptSrc = (file: string) =>
      (/content="([^"]*)"/.exec(read(file))?.[1] ?? '').split('; ').find((d) => d.startsWith('script-src')) ?? ''
    expect(scriptSrc('a.html')).toBe(scriptSrc('b.html'))
    expect(scriptSrc('a.html').match(/sha256-/g)).toHaveLength(2)
  })

  it('leaves a page it cannot anchor untouched, and does not count it', () => {
    const dir = buildOutput({ 'fragment.html': '<div>no head here</div>' })

    const { info } = run(dir)

    expect(read('fragment.html')).toBe('<div>no head here</div>')
    expect(info).toHaveBeenCalledWith(expect.stringContaining('0/1 pages'))
  })
})
