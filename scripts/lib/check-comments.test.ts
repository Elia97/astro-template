import { describe, expect, it } from 'vitest'

import { isComment, isNoisy, report, styleOf } from './check-comments.ts'

describe('styleOf', () => {
  it.each([
    ['.github/workflows/ci.yml', 'hash'],
    ['scripts/x.sh', 'hash'],
    ['src/styles/globals.css', 'css'],
    ['src/lib/site.ts', 'slash'],
  ])('reads %s as %s', (file, expected) => {
    expect(styleOf(file)).toBe(expected)
  })
})

describe('isComment', () => {
  it.each(['// line', '/* block', '* continuation', '{/* astro */}'])('reads %s as a comment', (line) => {
    expect(isComment(line, 'slash')).toBe(true)
  })

  it('reads # as a comment only in hash-style files, and never a shebang', () => {
    expect(isComment('# yaml', 'hash')).toBe(true)
    expect(isComment('# yaml', 'slash')).toBe(false)
    expect(isComment('#!/usr/bin/env node', 'hash')).toBe(false)
  })

  // `*` opens the universal selector, so in CSS only a closing `*/` is comment tail.
  it.each(['* {', '*:not([hidden])', '*, *::before'])('reads %s as CSS code', (line) => {
    expect(isComment(line, 'css')).toBe(false)
    expect(isComment(line, 'slash')).toBe(true)
  })

  it('still reads a closing block tail in CSS', () => {
    expect(isComment('*/', 'css')).toBe(true)
  })

  it('reads code as code', () => {
    expect(isComment('const a = 1', 'slash')).toBe(false)
  })
})

describe('report', () => {
  const lines = (...texts: string[]) => texts.map((text, i) => ({ n: i + 1, text }))

  it('flags a comment block past two lines', () => {
    const { findings } = report('src/a.ts', lines('// a', '// b', '// c', '// d', 'const a = 1'))

    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('block of 4 lines')
  })

  it('exempts a directive line without exempting the prose around it', () => {
    const withDirective = report('src/a.ts', lines('// a', '// b', '// biome-ignore lint/x: y'))
    const proseAroundIt = report('src/a.ts', lines('// a', '// b', '// c', '// [HARD] x'))

    expect(withDirective.findings).toEqual([])
    expect(proseAroundIt.findings[0]).toContain('block of 4 lines')
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
