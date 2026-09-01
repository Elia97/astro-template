#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { findingFor, isStable } from './lib/check-language.ts'

const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

const paths = [
  ...git(['ls-files']).split('\n'),
  ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
].filter((path) => path && isStable(path))

const findings = []
for (const path of paths.sort()) {
  const finding = findingFor(path, readFileSync(path, 'utf8'))
  if (finding) findings.push(finding)
}

console.log(`\ncheck:language — ${paths.length} files that travel between projects\n`)

for (const finding of findings) console.log(`  ✗ ${finding}`)

if (findings.length === 0) {
  console.log('  All English.\n')
  process.exit(0)
}

console.log('\n  The living per-project documents (ROADMAP, DECISIONS, PROJECT, plans, issues)\n')
console.log('  are not checked: those follow the project language. Rule in CLAUDE.md.\n')
process.exit(1)
