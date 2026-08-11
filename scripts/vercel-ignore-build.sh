#!/usr/bin/env bash
# Vercel "Ignored Build Step": the contract is inverted — exit 0 SKIPS the build, exit 1 proceeds.
# Production ships only from the `deploy` job in .github/workflows/deploy.yml, on the release tag.
set -euo pipefail

branch="${VERCEL_GIT_COMMIT_REF:-}"

if [[ "$branch" == "main" || "$branch" == release-please--* ]]; then
  echo "🛑 Skipping build on '$branch' (production ships from release-please tags)."
  exit 0
fi

echo "✅ Proceeding with build on '$branch' (preview)."
exit 1
