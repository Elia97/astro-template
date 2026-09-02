import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Executable form of docs/guides/ui-components.md § Motion scale: tokens.css is the only
// sheet allowed to spell a curve or a duration out.

const EFFECT_SHEETS = ['globals.css', 'light.css', 'dark.css'] as const

function read(file: string): string {
  return readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
}

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// A fallback inside var() is one instance's default, not a timing of the system.
function withoutVarFallbacks(css: string): string {
  return css.replace(/var\([^()]*\)/g, 'var()')
}

function timedDeclarations(css: string): string[] {
  return [...withoutVarFallbacks(withoutComments(css)).matchAll(/(?:transition|animation)[\w-]*:[^;]+;/g)].map(
    ([declaration]) => declaration.replace(/\s+/g, ' '),
  )
}

describe('motion scale', () => {
  it.each(EFFECT_SHEETS)('%s spells no easing curve out', (sheet) => {
    expect(withoutComments(read(sheet))).not.toContain('cubic-bezier(')
  })

  it.each(EFFECT_SHEETS)('%s times its transitions through tokens', (sheet) => {
    for (const declaration of timedDeclarations(read(sheet))) {
      expect(declaration).not.toMatch(/\d*\.?\d+m?s\b/)
    }
  })

  it('defines the tokens those sheets consume', () => {
    const tokens = read('tokens.css')

    expect(tokens).toMatch(/--ease-emphasized:\s*cubic-bezier\(/)
    expect(tokens).toMatch(/--duration-slower:\s*[\d.]+m?s;/)
  })
})
