#!/usr/bin/env bash
# Pre-tool hook for Bash: blocks destructive commands before execution.
# Second safety net on top of the deny rules in .claude/settings.json (deny
# rules are plain pattern-matching; here we can check flag/context
# combinations that are more sophisticated than a glob can express).

set -u

input=$(cat 2>/dev/null || true)
[[ -z "$input" ]] && exit 0

if ! command -v jq &>/dev/null; then exit 0; fi
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
[[ -z "$command" ]] && exit 0

declare -a patterns=(
  # Destructive git
  'git[[:space:]]+push[[:space:]]+(.*[[:space:]])?(--force|--force-with-lease|-f)([[:space:]]|$)'
  'git[[:space:]]+reset[[:space:]]+(.*[[:space:]])?--hard'
  'git[[:space:]]+clean[[:space:]]+(.*[[:space:]])?-[a-z]*f[a-z]*d'
  'git[[:space:]]+checkout[[:space:]]+--[[:space:]]'
  'git[[:space:]]+restore[[:space:]]+.*--staged.*--worktree'
  'git[[:space:]]+commit[[:space:]]+(.*[[:space:]])?--amend'
  'git[[:space:]]+rebase[[:space:]]+(.*[[:space:]])?-i'
  'git[[:space:]]+filter-repo'
  'git[[:space:]]+filter-branch'

  # Quality-gate / signing bypass
  '--no-verify'
  '--no-gpg-sign'
  'commit\.gpgsign=false'

  # Destructive filesystem
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+/(\*|[[:space:]]|$)'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+~'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+\.([[:space:]]|$)'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+\*'
  'rm[[:space:]]+-[a-z]*r[a-z]*f[[:space:]]+node_modules'

  # Privilege escalation
  '^sudo[[:space:]]'
  '[[:space:]]sudo[[:space:]]'
  'chmod[[:space:]]+777'

  # Wrong package manager (this repo is pnpm-only)
  '^npm[[:space:]]+install'
  '^yarn[[:space:]]'
  '^bun[[:space:]]+install'

  # GitHub issue/milestone mutations this workflow must never execute directly
  # — /milestone only ever creates issues/milestones; /pr only ever prints the
  # milestone-close command for the user to run, never runs it itself.
  'gh[[:space:]]+api[[:space:]]+.*-X[[:space:]]+DELETE'
  'gh[[:space:]]+api[[:space:]]+-X[[:space:]]+PATCH[[:space:]]+.*milestones/[0-9]'
)

for pattern in "${patterns[@]}"; do
  if echo "$command" | grep -qE "$pattern"; then
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
