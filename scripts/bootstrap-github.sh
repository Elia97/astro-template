#!/usr/bin/env bash
# Bootstrap GitHub — prerequisiti che i file di config NON coprono.
# Eseguire UNA volta dopo aver creato il repo su GitHub, da dentro il repo, con
# `gh` autenticato (gh auth status).
#
#   bash scripts/bootstrap-github.sh
#
# Idempotente: rieseguibile quando serve (`--force` sulle label, PUT sulla ruleset
# se esiste già).
set -euo pipefail

echo "==> 1/4 Label dependabot (senza, ogni PR dependabot logga 'label could not be found')"
gh label create dependencies --color 0366D6 --description "Dependency updates" --force
gh label create github-actions --color 000000 --description "GitHub Actions updates" --force

echo "==> 2/4 Merge policy: SOLO squash (1 commit/PR su main); titolo=PR, body vuoto"
# [HARD] Il body dello squash DEVE restare vuoto: release-please parsa anche le righe del
# body, e GitHub lo omette solo se è byte-identico al titolo della PR — una maiuscola o un
# backtick di differenza bastano a far comparire la stessa modifica due volte nel CHANGELOG.
# `--squash-merge-commit-message pr-title` → `squash_merge_commit_message=BLANK` lato API.
# Un solo flag — gh ha rimosso `--squash-merge-commit-title`; il titolo è implicito nel
# valore `pr-title*`. Conseguenza: un breaking change va marcato con `!` nel titolo della PR
# (`feat(ui)!: …`), perché un footer `BREAKING CHANGE:` non arriverebbe più a release-please.
gh repo edit \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --squash-merge-commit-message pr-title

echo "==> 3/4 Permessi Actions: consenti a release-please di aprire le release PR"
gh api -X PUT "repos/{owner}/{repo}/actions/permissions/workflow" \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true \
  || echo "   (se fallisce: Settings → Actions → General → Workflow permissions → ☑ Allow GitHub Actions to create and approve pull requests)"

echo "==> 4/4 Ruleset su main: la CI diventa un cancello, non un segnale"
# [HARD] Senza, la CI gira ma non lega niente: un push diretto su main o un merge con il
# check rosso arrivano in produzione al primo tag. Il required check è `ci` — unico job di
# ci.yml, quindi un solo context copre Biome + astro check + vitest + build.
# bypass_actors vuoto di proposito, admin inclusi: l'unica uscita d'emergenza è disattivare
# la ruleset da Settings → Rules, che resta nell'audit log. release-please non ha bisogno di
# bypass: apre una PR, e crea tag e release solo DOPO il merge.
ruleset_payload=$(cat << 'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
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
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "ci" }]
      }
    }
  ],
  "bypass_actors": []
}
JSON
)
# POST creerebbe un duplicato a ogni run: se la ruleset c'è già la si aggiorna.
ruleset_id=$(gh api "repos/{owner}/{repo}/rulesets" --jq '[.[] | select(.name == "main") | .id] | first // empty')
if [ -n "$ruleset_id" ]; then
  echo "$ruleset_payload" | gh api -X PUT "repos/{owner}/{repo}/rulesets/$ruleset_id" --input - > /dev/null
  echo "   ruleset 'main' aggiornata (id $ruleset_id)"
else
  echo "$ruleset_payload" | gh api -X POST "repos/{owner}/{repo}/rulesets" --input - > /dev/null
  echo "   ruleset 'main' creata"
fi
echo "   da ora main accetta solo PR con check 'ci' verde — il push diretto viene rifiutato"

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
