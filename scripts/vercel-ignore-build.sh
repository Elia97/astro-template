#!/usr/bin/env bash
# Vercel "Ignored Build Step".
#
# Production ships ONLY from the `deploy` job in .github/workflows/release-please.yml
# (on the release tag), never from Vercel's git integration. Hence:
#   - SKIP the build (exit 0) on `main` and on the internal `release-please--*` branches
#   - PROCEED with the build (exit 1) on every other branch → preview deployment
#
# Configure it in Vercel: Settings → Build & Deployment → Ignored Build Step →
# "Run my Bash script" → `bash scripts/vercel-ignore-build.sh`.
set -euo pipefail

branch="${VERCEL_GIT_COMMIT_REF:-}"

if [[ "$branch" == "main" || "$branch" == release-please--* ]]; then
  echo "🛑 Skipping build on '$branch' (production ships from release-please tags)."
  exit 0
fi

echo "✅ Proceeding with build on '$branch' (preview)."
exit 1
