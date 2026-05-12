import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadPublicEnv, publicBoolean, publicEnum, publicString } from '../../src/lib/env'

describe('envField helpers', () => {
  it('publicString builds a string field with context+access+default', () => {
    const field = publicString('Inter')
    expect(field).toMatchObject({
      type: 'string',
      context: 'client',
      access: 'public',
      default: 'Inter',
    })
  })

  it('publicEnum builds an enum field with the given values and default', () => {
    const field = publicEnum(['a', 'b', 'c'], 'a')
    expect(field).toMatchObject({
      type: 'enum',
      context: 'client',
      access: 'public',
      values: ['a', 'b', 'c'],
      default: 'a',
    })
  })

  it('publicBoolean builds a boolean field with the given default', () => {
    const field = publicBoolean(true)
    expect(field).toMatchObject({
      type: 'boolean',
      context: 'client',
      access: 'public',
      default: true,
    })
  })
})

describe('loadPublicEnv', () => {
  let tmpRoot: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tmpRoot = mkdtempSync(join(tmpdir(), 'astro-env-'))
    process.chdir(tmpRoot)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('returns empty object when .env is missing', () => {
    expect(loadPublicEnv()).toEqual({})
  })

  it('returns only PUBLIC_ prefixed variables', () => {
    writeFileSync(
      '.env',
      ['PUBLIC_FOO=bar', 'PUBLIC_QUOTED="baz qux"', 'SECRET_KEY=hidden', '# comment line', ''].join(
        '\n',
      ),
    )
    const env = loadPublicEnv()
    expect(env).toEqual({
      PUBLIC_FOO: 'bar',
      PUBLIC_QUOTED: 'baz qux',
    })
    expect(env).not.toHaveProperty('SECRET_KEY')
  })
})
