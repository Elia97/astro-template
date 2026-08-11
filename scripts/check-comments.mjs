#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { isNoisy, report, SCANNED } from './lib/check-comments.ts'

const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

// Tracked plus untracked: this runs before the commit, and a file just written is the one
// that most needs looking at.
const paths = [
  ...git(['ls-files']).split('\n'),
  ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
].filter((path) => path && SCANNED.test(path))

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
