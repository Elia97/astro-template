export interface Line {
  n: number
  text: string
}

export interface FileReport {
  findings: string[]
  comments: number
  total: number
}

const MAX_BLOCK_LINES = 2
const NOISY_RATIO = 0.15
const MIN_LINES_FOR_RATIO = 40

const KEEP =
  /biome-ignore|@ts-|\/\/\/\s*<reference|@vitest-environment|fallow-ignore|v8 ignore|TODO|FIXME|\[HARD\]|@public|@internal|@deprecated|^#!/

const HASH_STYLE = /\.(ya?ml|sh)$/
// Out: files where the comment *is* the content — in `.env.example` and `.npmrc` every
// line of prose documents the key below it.
export const SCANNED = /\.(ts|tsx|astro|mjs|js|css|ya?ml|sh)$/

const PAST_TENSE = [
  /\bprima (era|c'era|veniva|faceva|andava|lo |si )/i,
  /\bin precedenza\b|\bnon più\b|\buna volta era\b|\bera stato\b/i,
  /\bora (è|invece|lo |la |il |si |c'è|non)|\badesso\b/i,
  /\bsostituisce\b|\bal posto di\b|\bnon serve più\b|\bvecchi[oa]\b/i,
  /\bused to\b|\bpreviously\b|\bno longer\b|\breplaces the\b|\breplaced by\b|\bremoved in\b/i,
  /#\d{1,3}\b/,
]

export function isComment(line: string, hashStyle: boolean): boolean {
  const s = line.trim()
  if (hashStyle) return s.startsWith('#') && !s.startsWith('#!')
  return s.startsWith('//') || s.startsWith('/*') || s.startsWith('*') || s.startsWith('{/*')
}

function blockFinding(file: string, block: Line[]): string | null {
  if (block.length <= MAX_BLOCK_LINES) return null
  if (block.some((b) => KEEP.test(b.text))) return null
  return `${file}:${block[0]?.n}  block of ${block.length} lines (max ${MAX_BLOCK_LINES})`
}

function pastTenseFinding(file: string, line: Line): string | null {
  if (KEEP.test(line.text)) return null
  if (!PAST_TENSE.some((re) => re.test(line.text))) return null
  return `${file}:${line.n}  narrates the change: ${line.text.trim().slice(0, 60)}`
}

export function report(file: string, lines: Line[]): FileReport {
  const hashStyle = HASH_STYLE.test(file)
  const findings: string[] = []
  let comments = 0
  let block: Line[] = []

  for (const line of lines) {
    if (!isComment(line.text, hashStyle)) {
      const finding = blockFinding(file, block)
      if (finding) findings.push(finding)
      block = []
      continue
    }
    comments += 1
    block.push(line)
    const narrated = pastTenseFinding(file, line)
    if (narrated) findings.push(narrated)
  }
  const finding = blockFinding(file, block)
  if (finding) findings.push(finding)

  return { findings, comments, total: lines.length }
}

export function isNoisy({ comments, total }: FileReport): boolean {
  return total >= MIN_LINES_FOR_RATIO && comments / total > NOISY_RATIO
}
