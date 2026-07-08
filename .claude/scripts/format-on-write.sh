#!/usr/bin/env bash
# Runs Biome (format + lint --write) on the file Claude just wrote/edited.
# Mirrors lefthook's pre-commit step exactly — it's normal to see no diff
# from lefthook at commit time if this hook already ran.

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

# --no-errors-on-unmatched: Biome no-ops gracefully on extensions/paths it
# doesn't handle or that biome.json excludes — no hardcoded extension
# allowlist needed, unlike a Prettier-based hook.
pnpm exec biome check --write --no-errors-on-unmatched "$file_path" >/dev/null 2>&1 || true

exit 0
