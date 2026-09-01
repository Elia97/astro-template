import { isComment, styleOf } from './check-comments.ts'

// The files that travel between projects. The living per-project documents (ROADMAP,
// DECISIONS, PROJECT, plans) are deliberately absent — CLAUDE.md § Language.
const STABLE = [
  /^CLAUDE\.md$/,
  /^docs\/ARCHITECTURE\.md$/,
  /^docs\/guides\//,
  /^docs\/milestone-templates\//,
  /^docs\/proposal-templates\//,
  /^\.claude\/(?:commands|agents)\//,
]

const CODE = /^src\/.*\.(?:ts|tsx|astro)$/

// Function words that belong to one language only: "in", "come" and "solo" exist in both
// and would blur the count.
const ITALIAN =
  /\b(?:che|non|per|della|delle|degli|dei|gli|una|sono|viene|questo|questa|quando|anche|già|ogni|nella|nel|con|sul|dalla|essere|senza|quindi|perché)\b/gi
const ENGLISH =
  /\b(?:the|and|that|with|from|this|is|are|of|when|only|also|already|every|but|which|what|they|their|does|has|without|so|because)\b/gi

// Under this many hits the sample says nothing: a short file scores 2-1 on noise alone.
const MIN_HITS = 12

export function isStable(path: string): boolean {
  return STABLE.some((pattern) => pattern.test(path)) || CODE.test(path)
}

/** Only the comments carry prose in a source file — the code itself is English by construction. */
export function proseOf(path: string, source: string): string {
  if (!CODE.test(path)) return source
  return source
    .split('\n')
    .filter((line) => isComment(line, styleOf(path)))
    .join('\n')
}

export type Verdict = 'english' | 'italian' | 'undecided'

export function classify(prose: string): Verdict {
  const italian = (prose.match(ITALIAN) ?? []).length
  const english = (prose.match(ENGLISH) ?? []).length

  if (italian + english < MIN_HITS) return 'undecided'
  return italian > english ? 'italian' : 'english'
}

export function findingFor(path: string, source: string): string | null {
  if (classify(proseOf(path, source)) !== 'italian') return null
  return `${path}  reads as Italian — files that travel between projects stay English`
}
