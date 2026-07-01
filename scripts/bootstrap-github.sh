#!/usr/bin/env bash
# Bootstrap GitHub — prerequisiti che i file di config NON coprono.
# Eseguire UNA volta dopo aver creato il repo su GitHub, da dentro il repo, con
# `gh` autenticato (gh auth status).
#
#   bash scripts/bootstrap-github.sh
#
# Idempotente dove possibile (`--force` sulle label).
set -euo pipefail

echo "==> 1/3 Label dependabot (senza, ogni PR dependabot logga 'label could not be found')"
gh label create dependencies --color 0366D6 --description "Dependency updates" --force
gh label create github-actions --color 000000 --description "GitHub Actions updates" --force

echo "==> 2/3 Merge policy: SOLO squash (1 commit/PR su main); titolo=PR, body=commit messages"
# Il body dello squash = i commit dei sotto-task → release-please li mette nel CHANGELOG.
# `--squash-merge-commit-message pr-title-commits`: titolo = PR title, body = commit
# messages dei sotto-task (release-please li mette nel CHANGELOG). Un solo flag — gh ha
# rimosso `--squash-merge-commit-title`; il titolo è implicito nel valore `pr-title-*`.
gh repo edit \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --squash-merge-commit-message pr-title-commits

echo "==> 3/3 Permessi Actions: consenti a release-please di aprire le release PR"
gh api -X PUT "repos/{owner}/{repo}/actions/permissions/workflow" \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true \
  || echo "   (se fallisce: Settings → Actions → General → Workflow permissions → ☑ Allow GitHub Actions to create and approve pull requests)"

cat << 'EOF'

==> DA FARE A MANO (secret/impostazioni non automatizzabili in sicurezza qui):

  1. RELEASE_PLEASE_TOKEN — PAT fine-grained (contents:write + pull_requests:write).
     Serve perché la CI giri sulle release PR (con GITHUB_TOKEN NON parte).
       gh secret set RELEASE_PLEASE_TOKEN

  2. Secret Vercel (deploy prod automatico su release):
       gh secret set VERCEL_TOKEN
       gh secret set VERCEL_ORG_ID
       gh secret set VERCEL_PROJECT_ID

  3. Vercel → Settings → Build & Deployment → Ignored Build Step →
     "Run my Bash script" → bash scripts/vercel-ignore-build.sh

  4. (Auto-deploy su release attivo) l'environment 'production' viene creato al
     primo run del workflow; opzionale: Settings → Environments → production →
     required reviewers, se in futuro vuoi un gate manuale sul deploy.

EOF
echo "✓ Bootstrap GitHub completato."
