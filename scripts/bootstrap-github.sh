#!/usr/bin/env bash
# Bootstrap GitHub — the prerequisites config files do NOT cover.
# Run it once after creating the repo on GitHub, from inside the repo, with `gh`
# authenticated (gh auth status).
#
#   bash scripts/bootstrap-github.sh
#
# Idempotent: re-run it whenever (`--force` on the labels, PUT on the ruleset
# when it already exists).
set -euo pipefail

echo "==> 1/4 Dependabot labels (without them every dependabot PR logs 'label could not be found')"
gh label create dependencies --color 0366D6 --description "Dependency updates" --force
gh label create github-actions --color 000000 --description "GitHub Actions updates" --force

echo "==> 2/4 Merge policy: squash ONLY (1 commit/PR on main); title=PR, body empty"
# [HARD] The squash body MUST stay empty: release-please parses body lines too, and GitHub
# omits the body only when it is byte-identical to the PR title — one capital letter or one
# backtick of difference is enough to list the same change twice in the CHANGELOG.
# `--squash-merge-commit-message pr-title` → `squash_merge_commit_message=BLANK` API-side.
# One flag only — gh dropped `--squash-merge-commit-title`; the title is implied by the
# `pr-title*` value. Consequence: a breaking change has to be marked with `!` in the PR title
# (`feat(ui)!: …`), because a `BREAKING CHANGE:` footer would no longer reach release-please.
gh repo edit \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --squash-merge-commit-message pr-title

echo "==> 3/4 Actions permissions: let release-please open the release PRs"
gh api -X PUT "repos/{owner}/{repo}/actions/permissions/workflow" \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true \
  || echo "   (if it fails: Settings → Actions → General → Workflow permissions → ☑ Allow GitHub Actions to create and approve pull requests)"

echo "==> 4/4 Ruleset on main: CI becomes a gate, not a signal"
# [HARD] Without it CI runs but binds nothing: a direct push to main, or a merge with the
# check red, reaches production at the next tag. The required check is `ci` — the only job in
# ci.yml, so one context covers Biome + astro check + vitest + build + bundle budget.
# bypass_actors is empty on purpose, admins included: the only emergency exit is disabling
# the ruleset from Settings → Rules, which stays in the audit log. release-please needs no
# bypass: it opens a PR, and cuts tag and release only AFTER the merge.
# strict_required_status_checks_policy=true ("branch up to date before merging") is what keeps
# two PRs green against an OLDER main from both landing and leaving main red on their
# combination. Learned the hard way: two dependabot PRs squashed 92 seconds apart auto-merged
# their pnpm-lock.yaml into a hybrid with a duplicated key — unparsable YAML, every CI job
# down, and dependabot itself unable to run until the lockfile was repaired by hand. The cost
# of strict is a rebase per open PR whenever main moves; the single-group dependabot config in
# .github/dependabot.yml is what keeps that cost to one PR per ecosystem per cycle.
# required_linear_history is redundant while the repo stays squash-only, and is here as defence
# in depth: re-enabling merge commits in Settings is one click, undoing this rule is not.
ruleset_payload=$(cat << 'JSON'
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
        "required_status_checks": [{ "context": "ci" }]
      }
    }
  ],
  "bypass_actors": []
}
JSON
)
# A plain POST would create a duplicate on every run: update the ruleset when it exists.
ruleset_id=$(gh api "repos/{owner}/{repo}/rulesets" --jq '[.[] | select(.name == "main") | .id] | first // empty')
if [ -n "$ruleset_id" ]; then
  echo "$ruleset_payload" | gh api -X PUT "repos/{owner}/{repo}/rulesets/$ruleset_id" --input - > /dev/null
  echo "   ruleset 'main' updated (id $ruleset_id)"
else
  echo "$ruleset_payload" | gh api -X POST "repos/{owner}/{repo}/rulesets" --input - > /dev/null
  echo "   ruleset 'main' created"
fi
echo "   from now on main only accepts PRs with a green 'ci' check — direct pushes are refused"

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
