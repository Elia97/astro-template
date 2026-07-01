#!/usr/bin/env bash
# Vercel "Ignored Build Step".
#
# La produzione esce SOLO dal job `deploy` di .github/workflows/release-please.yml
# (sul tag di release), non dall'integrazione git di Vercel. Quindi:
#   - SKIP build (exit 0) su `main` e sui branch interni `release-please--*`
#   - PROCEED build (exit 1) su ogni altro branch → preview deployment
#
# Configurare in Vercel: Settings → Build & Deployment → Ignored Build Step →
# "Run my Bash script" → `bash scripts/vercel-ignore-build.sh`.
set -euo pipefail

branch="${VERCEL_GIT_COMMIT_REF:-}"

if [[ "$branch" == "main" || "$branch" == release-please--* ]]; then
  echo "🛑 Skip build su '$branch' (la produzione esce dai tag release-please)."
  exit 0
fi

echo "✅ Proceed build su '$branch' (preview)."
exit 1
