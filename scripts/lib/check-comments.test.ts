import { describe, expect, it } from 'vitest'

import { isComment, isNoisy, report } from './check-comments.ts'

describe('isComment', () => {
  it.each(['// line', '/* block', '* continuation', '{/* astro */}'])('reads %s as a comment', (line) => {
    expect(isComment(line, false)).toBe(true)
  })

  it('reads # as a comment only in hash-style files, and never a shebang', () => {
    expect(isComment('# yaml', true)).toBe(true)
    expect(isComment('# yaml', false)).toBe(false)
    expect(isComment('#!/usr/bin/env node', true)).toBe(false)
  })

  it('reads code as code', () => {
    expect(isComment('const a = 1', false)).toBe(false)
  })
})

describe('report', () => {
  const lines = (...texts: string[]) => texts.map((text, i) => ({ n: i + 1, text }))

  it('flags a comment block past two lines', () => {
    const { findings } = report('src/a.ts', lines('// a', '// b', '// c', '// d', 'const a = 1'))

    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('block of 4 lines')
  })

  it('spares a long block carrying a functional directive', () => {
    const { findings } = report('src/a.ts', lines('// a', '// b', '// c', '// biome-ignore lint/x: y'))

    expect(findings).toEqual([])
  })

  it('flags a comment narrating the change instead of the code, in either language', () => {
    expect(report('src/a.ts', lines('// replaces the old helper')).findings[0]).toContain('narrates the change')
    expect(report('src/a.ts', lines('// sostituisce il vecchio helper')).findings[0]).toContain('narrates the change')
  })

  it('leaves alone a comment describing the code as it is', () => {
    const { findings } = report('src/a.ts', lines('// Brevo answers 204 for a contact already subscribed'))

    expect(findings).toEqual([])
  })

  it('counts the comment lines of the file', () => {
    const result = report('src/a.ts', lines('// a', 'const a = 1'))

    expect(result).toMatchObject({ comments: 1, total: 2 })
  })

  it('closes a block still open at the end of the file', () => {
    const { findings } = report('src/a.ts', lines('// a', '// b', '// c', '// d'))

    expect(findings[0]).toContain('block of 4 lines')
  })
})

describe('isNoisy', () => {
  it('ignores short files, where the ratio says nothing', () => {
    expect(isNoisy({ findings: [], comments: 20, total: 39 })).toBe(false)
  })

  it('flags a long file where comments pass 15% of the lines', () => {
    expect(isNoisy({ findings: [], comments: 10, total: 40 })).toBe(true)
    expect(isNoisy({ findings: [], comments: 6, total: 40 })).toBe(false)
  })
})
