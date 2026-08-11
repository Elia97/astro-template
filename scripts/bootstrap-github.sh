#!/usr/bin/env bash
# GitHub-side config no file in the tree can carry. Idempotent — re-run it whenever (HOW_TO_USE.md).
set -euo pipefail

echo "==> 1/4 Dependabot labels (without them every dependabot PR logs 'label could not be found')"
gh label create dependencies --color 0366D6 --description "Dependency updates" --force
gh label create github-actions --color 000000 --description "GitHub Actions updates" --force

echo "==> 2/4 Merge policy: squash ONLY (1 commit/PR on main); title=PR, body empty"
# [HARD] Squash body stays empty; breaking changes need `!` in the title — docs/guides/deploy-ops.md § Release flow.
gh repo edit \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --squash-merge-commit-message pr-title

echo "==> 3/4 Actions permissions: let release-please open the release PRs"
# Default stays READ — the token every workflow gets when it declares none; release-please.yml asks for write itself.
gh api -X PUT "repos/{owner}/{repo}/actions/permissions/workflow" \
  -f default_workflow_permissions=read \
  -F can_approve_pull_request_reviews=true \
  || echo "   (if it fails: Settings → Actions → General → Workflow permissions → ☑ Allow GitHub Actions to create and approve pull requests)"

echo "==> 4/4 Ruleset on main: CI becomes a gate, not a signal"
# [HARD] Without it CI runs but binds nothing — bypass policy and strict checks: docs/guides/deploy-ops.md.
# actor_id 5 is GitHub's admin repository role.
if [ "${ADMIN_BYPASS:-0}" = "1" ]; then
  bypass_actors='[{ "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }]'
  echo "   ADMIN_BYPASS=1 → the admin role can still push straight to main"
else
  bypass_actors='[]'
fi

ruleset_payload=$(cat << JSON
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "ci" }, { "context": "Validate PR title" }]
      }
    }
  ],
  "bypass_actors": ${bypass_actors}
}
JSON
)
# The rulesets API takes duplicate names: without this lookup a re-run stacks a second 'main'.
ruleset_id=$(gh api "repos/{owner}/{repo}/rulesets" --jq '[.[] | select(.name == "main") | .id] | first // empty')
if [ -n "$ruleset_id" ]; then
  echo "$ruleset_payload" | gh api -X PUT "repos/{owner}/{repo}/rulesets/$ruleset_id" --input - > /dev/null
  echo "   ruleset 'main' updated (id $ruleset_id)"
else
  echo "$ruleset_payload" | gh api -X POST "repos/{owner}/{repo}/rulesets" --input - > /dev/null
  echo "   ruleset 'main' created"
fi
if [ "${ADMIN_BYPASS:-0}" = "1" ]; then
  echo "   main now takes PRs with a green 'ci' check — the admin role can still push directly"
else
  echo "   from now on main only accepts PRs with a green 'ci' check — direct pushes are refused"
fi

cat << 'EOF'

==> TO DO BY HAND (secrets/settings that cannot safely be automated here):

  1. RELEASE_PLEASE_TOKEN — fine-grained PAT (contents:write + pull_requests:write).
     Needed for CI to run on the release PRs (with GITHUB_TOKEN it does NOT).
       gh secret set RELEASE_PLEASE_TOKEN

  2. Vercel secrets (automatic production deploy on release):
       gh secret set VERCEL_TOKEN
       gh secret set VERCEL_ORG_ID
       gh secret set VERCEL_PROJECT_ID

  3. Vercel → Settings → Build & Deployment → Ignored Build Step →
     "Run my Bash script" → bash scripts/vercel-ignore-build.sh

  4. (With release auto-deploy active) the 'production' environment is created on
     the workflow's first run; optional: Settings → Environments → production →
     required reviewers, if you ever want a manual gate on the deploy.

EOF
echo "✓ GitHub bootstrap complete."
