#!/usr/bin/env bash
# Wired as a PreToolUse hook in .claude/settings.json, whose deny rules can only glob.

set -u

input=$(cat 2>/dev/null || true)
[[ -z "$input" ]] && exit 0

if ! command -v jq &>/dev/null; then exit 0; fi
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
[[ -z "$command" ]] && exit 0

declare -a patterns=(
  'git[[:space:]]+push[[:space:]]+(.*[[:space:]])?(--force|--force-with-lease|-f)([[:space:]]|$)'
  'git[[:space:]]+reset[[:space:]]+(.*[[:space:]])?--hard'
  'git[[:space:]]+clean[[:space:]]+(.*[[:space:]])?-[a-z]*f[a-z]*d'
  'git[[:space:]]+checkout[[:space:]]+--[[:space:]]'
  'git[[:space:]]+restore[[:space:]]+.*--staged.*--worktree'
  'git[[:space:]]+commit[[:space:]]+(.*[[:space:]])?--amend'
  'git[[:space:]]+rebase[[:space:]]+(.*[[:space:]])?-i'
  'git[[:space:]]+filter-repo'
  'git[[:space:]]+filter-branch'

  '--no-verify'
  '--no-gpg-sign'
  'commit\.gpgsign=false'

  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+/(\*|[[:space:]]|$)'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+~'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+\.([[:space:]]|$)'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+\*'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+node_modules'

  '^sudo[[:space:]]'
  '[[:space:]]sudo[[:space:]]'
  'chmod[[:space:]]+777'

  '^npm[[:space:]]+install'
  '^yarn[[:space:]]'
  '^bun[[:space:]]+install'

  'gh[[:space:]]+api[[:space:]]+.*-X[[:space:]]+DELETE'
  'gh[[:space:]]+api[[:space:]]+-X[[:space:]]+PATCH[[:space:]]+.*milestones/[0-9]'
)

for pattern in "${patterns[@]}"; do
  # `--` is required: without it grep reads `--no-verify` as an option and the pattern never matches.
  if echo "$command" | grep -qE -- "$pattern"; then
    cat >&2 <<EOF
Command blocked by the pre-tool hook (.claude/scripts/block-destructive.sh)

  Command: $command
  Match:   $pattern

If this is genuinely necessary, ask the user for explicit confirmation before
proceeding. Bypassing quality gates (--no-verify, --no-gpg-sign) and
destructive git/filesystem operations are outside this project's standard
rules (see CLAUDE.md, "Workflow [HARD]" section).
EOF
    exit 2
  fi
done

exit 0
