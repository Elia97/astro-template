#!/usr/bin/env bash
# Vercel "Ignored Build Step" — production ships ONLY from the `deploy` job in
# .github/workflows/deploy.yml (on the release tag), never from Vercel's git
# integration. Vercel's contract is inverted: exit 0 SKIPS the build, exit 1 proceeds.
set -euo pipefail

branch="${VERCEL_GIT_COMMIT_REF:-}"

if [[ "$branch" == "main" || "$branch" == release-please--* ]]; then
  echo "🛑 Skipping build on '$branch' (production ships from release-please tags)."
  exit 0
fi

echo "✅ Proceeding with build on '$branch' (preview)."
exit 1
