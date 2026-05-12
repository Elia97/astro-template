import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { buildFontConfig, scanLocalDir, FONT_DEFAULTS } from '../../../src/lib/theme/fonts'

describe('buildFontConfig', () => {
  it('uses defaults when env is empty', () => {
    const cfg = buildFontConfig('sans', {})
    expect(cfg.name).toBe(FONT_DEFAULTS.sans.name)
    expect(cfg.cssVariable).toBe('--font-sans')
    expect(cfg.provider.name).toBe('google')
  })

  it('uses google provider when configured', () => {
    const cfg = buildFontConfig('serif', {
      PUBLIC_FONT_SERIF_PROVIDER: 'google',
      PUBLIC_FONT_SERIF_NAME: 'Roboto',
    })
    expect(cfg.name).toBe('Roboto')
    expect(cfg.cssVariable).toBe('--font-serif')
    expect(cfg.provider.name).toBe('google')
  })

  it('uses fontsource provider when configured', () => {
    const cfg = buildFontConfig('mono', {
      PUBLIC_FONT_MONO_PROVIDER: 'fontsource',
      PUBLIC_FONT_MONO_NAME: 'Geist Mono',
    })
    expect(cfg.name).toBe('Geist Mono')
    expect(cfg.provider.name).toBe('fontsource')
  })

  it('throws when provider=local but LOCAL_DIR is empty', () => {
    expect(() =>
      buildFontConfig('sans', {
        PUBLIC_FONT_SANS_PROVIDER: 'local',
        PUBLIC_FONT_SANS_NAME: 'Custom',
        PUBLIC_FONT_SANS_LOCAL_DIR: '',
      }),
    ).toThrow(/LOCAL_DIR is required/)
  })
})

describe('scanLocalDir', () => {
  let tmpRoot: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tmpRoot = mkdtempSync(join(tmpdir(), 'astro-fonts-'))
    process.chdir(tmpRoot)
    mkdirSync('src/assets/fonts', { recursive: true })
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('throws when dir is empty string', () => {
    expect(() => scanLocalDir('', 'sans')).toThrow(/LOCAL_DIR is required/)
  })

  it('throws when no font files are present', () => {
    mkdirSync('src/assets/fonts/custom')
    expect(() => scanLocalDir('custom', 'sans')).toThrow(/No font files found/)
  })

  it('returns one variant when only Regular.woff2 is present', () => {
    const dir = 'src/assets/fonts/custom'
    mkdirSync(dir)
    writeFileSync(resolve(dir, 'Regular.woff2'), Buffer.alloc(0))

    const variants = scanLocalDir('custom', 'sans')
    expect(variants).toHaveLength(1)
    expect(variants[0]).toMatchObject({
      weight: 400,
      style: 'normal',
      src: ['./src/assets/fonts/custom/Regular.woff2'],
    })
  })

  it('returns all 4 variants when all files are present', () => {
    const dir = 'src/assets/fonts/brand'
    mkdirSync(dir)
    for (const name of ['Regular.woff2', 'Italic.woff2', 'Bold.woff2', 'BoldItalic.woff2']) {
      writeFileSync(resolve(dir, name), Buffer.alloc(0))
    }

    const variants = scanLocalDir('brand', 'sans')
    expect(variants).toHaveLength(4)
    expect(variants.map((v) => v.style)).toEqual(['normal', 'italic', 'normal', 'italic'])
    expect(variants.map((v) => v.weight)).toEqual([400, 400, 700, 700])
  })

  it('ignores files that do not match the convention', () => {
    const dir = 'src/assets/fonts/brand'
    mkdirSync(dir)
    writeFileSync(resolve(dir, 'Regular.woff2'), Buffer.alloc(0))
    writeFileSync(resolve(dir, 'Random.woff2'), Buffer.alloc(0))

    const variants = scanLocalDir('brand', 'sans')
    expect(variants).toHaveLength(1)
  })
})
