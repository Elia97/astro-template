#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

import { isNoisy, report, SCANNED } from './lib/check-comments.ts'

const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).split('\n')

const tryGit = (args) => {
  try {
    return git(args)
  } catch {
    return []
  }
}

const untracked = () => git(['ls-files', '--others', '--exclude-standard'])

// `--diff [base]` narrows the sweep to what this branch touched, for the per-PR pass where
// inherited debt is noise. Without it the whole tree is read: yesterday's debt counts too.
function diffPaths(requestedBase) {
  const base = requestedBase ?? (tryGit(['rev-parse', '--verify', 'origin/main']).length ? 'origin/main' : 'main')
  const [mergeBase] = tryGit(['merge-base', base, 'HEAD'])
  if (!mergeBase) {
    console.error(`\n✗ base "${base}" does not resolve — pass one explicitly: --diff <branch>\n`)
    process.exit(1)
  }
  return [...git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase]), ...untracked()]
}

const diffIndex = process.argv.indexOf('--diff')
const scope = diffIndex === -1 ? [...git(['ls-files']), ...untracked()] : diffPaths(process.argv[diffIndex + 1])
const paths = scope.filter((path) => path && SCANNED.test(path)).filter(existsSync)

let totalLines = 0
let totalComments = 0
const findings = []
const noisy = []

for (const path of paths.sort()) {
  const lines = readFileSync(path, 'utf8')
    .split('\n')
    .map((text, i) => ({ n: i + 1, text }))
  const result = report(path, lines)

  totalLines += result.total
  totalComments += result.comments
  findings.push(...result.findings)
  if (isNoisy(result)) noisy.push(`${path}  ${result.comments}/${result.total} lines are comment`)
}

const ratio = ((totalComments / totalLines) * 100).toFixed(1)
console.log(`\ncheck:comments — ${totalComments}/${totalLines} lines in the project are comment (${ratio}%)\n`)

for (const finding of findings) console.log(`  ✗ ${finding}`)
for (const file of noisy) console.log(`  · ${file}`)

if (findings.length === 0 && noisy.length === 0) {
  console.log('  Nothing over the threshold.\n')
} else {
  console.log(
    '\n  The default is not to comment: only the particular cases, in the present tense,\n' +
      '  about the code as it is now. Cases and form in CLAUDE.md.\n',
  )
}
