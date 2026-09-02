import { describe, expect, it } from 'vitest'

import { classify, findingFor, isStable, proseOf } from './check-language.ts'

// Long enough to clear MIN_HITS: under it the classifier declines to judge, which the
// third case below covers.
const italian = [
  'Questa guida non è una traduzione: descrive che cosa fa il codice quando una sezione viene aggiunta.',
  'Ogni regola sta nella sezione che la riguarda, con il file e il simbolo, e non è una previsione.',
  'Quando il codice cambia, questo documento cambia con lui: senza quel passaggio la guida mente.',
].join(' ')
const english = [
  'This guide is not a translation: it describes what the code does when a section is added.',
  'Every rule sits in the section that carries it, with the file and the symbol, and is never a prediction.',
  'When the code changes this document changes with it: without that step the guide lies.',
].join(' ')

describe('isStable', () => {
  it.each(['CLAUDE.md', 'docs/ARCHITECTURE.md', 'docs/guides/seo.md', '.claude/commands/pr.md', 'src/lib/site.ts'])(
    'covers %s',
    (path) => {
      expect(isStable(path)).toBe(true)
    },
  )

  // The living documents follow the project's own language, so they are never judged.
  it.each(['docs/ROADMAP.md', 'docs/DECISIONS.md', 'docs/PROJECT.md', '.claude/plans/pr-1-x.md', 'README.md'])(
    'leaves %s alone',
    (path) => {
      expect(isStable(path)).toBe(false)
    },
  )
})

describe('classify', () => {
  it('reads Italian prose as Italian', () => {
    expect(classify(italian)).toBe('italian')
  })

  it('reads English prose as English', () => {
    expect(classify(english)).toBe('english')
  })

  it('refuses to judge a sample too short to carry the signal', () => {
    expect(classify('Ciao.')).toBe('undecided')
  })
})

describe('proseOf', () => {
  it('keeps only the comments of a source file', () => {
    const source = ['// questo commento non è in inglese', 'const value = 1', '/* neither is questo */'].join('\n')

    expect(proseOf('src/lib/x.ts', source)).toBe('// questo commento non è in inglese\n/* neither is questo */')
  })

  it('takes a markdown file whole', () => {
    expect(proseOf('docs/guides/seo.md', '# Title\n\nBody.')).toBe('# Title\n\nBody.')
  })
})

describe('findingFor', () => {
  it('reports an Italian file that travels', () => {
    expect(findingFor('docs/guides/seo.md', italian)).toContain('reads as Italian')
  })

  it('passes an English one', () => {
    expect(findingFor('docs/guides/seo.md', english)).toBeNull()
  })

  it('passes a file whose comments are English while the code is not prose', () => {
    const source = [
      '// The gate reads the emitted chunks and nothing else, so this is what it sees.',
      'const a = 1',
    ].join('\n')

    expect(findingFor('src/lib/x.ts', source)).toBeNull()
  })
})
