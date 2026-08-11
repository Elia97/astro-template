#!/usr/bin/env bash
# TODO: this repeats lefthook.yml's `biome-check` command; centralise the two on one script.

set -u

input=$(cat 2>/dev/null || true)
[[ -z "$input" ]] && exit 0

if ! command -v jq &>/dev/null; then exit 0; fi
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[[ -z "$file_path" ]] && exit 0
[[ ! -f "$file_path" ]] && exit 0

case "$file_path" in
  "$HOME"/.claude/*) exit 0 ;;
  /tmp/*) exit 0 ;;
esac

if ! command -v pnpm &>/dev/null; then exit 0; fi
if [[ ! -f package.json ]]; then exit 0; fi
if [[ ! -d node_modules ]]; then exit 0; fi

pnpm exec biome check --write --no-errors-on-unmatched "$file_path" >/dev/null 2>&1 || true

exit 0
