# GitHub CLI (`gh`)

CLI ufficiale di GitHub. Permette di gestire repo, PR, issue, workflow e release
direttamente da terminale.

## Installazione (Ubuntu / WSL)

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

> ⚠️ Il comando `echo` della sources.list deve restare su **una sola riga**,
> altrimenti l'URL viene spezzato e `apt update` fallisce con `Malformed entry`.

## Autenticazione

```bash
gh auth login                    # login interattivo (browser o token)
gh auth status                   # verifica lo stato
gh auth refresh -s workflow      # aggiunge scope (es. per modificare workflows)
gh auth logout
```

Scope utili da aggiungere quando servono:

- `workflow` — necessario per mergiare PR che toccano `.github/workflows/*`
- `read:org` — leggere team/membership
- `delete_repo` — eliminare repository

## Repository

```bash
gh repo view                     # info sul repo corrente
gh repo view --web               # apre il repo nel browser
gh repo clone owner/name
gh repo create my-repo --public
gh repo fork
gh repo set-default              # imposta il repo di riferimento per i comandi
```

## Pull Request

Il dominio più usato di `gh`.

### Lettura

```bash
gh pr list                       # PR aperte
gh pr list --state all
gh pr list --author "app/dependabot"
gh pr view 42
gh pr view 42 --web
gh pr diff 42
gh pr checks 42                  # stato CI
gh pr checks --watch             # segue la CI in tempo reale
gh pr status                     # PR rilevanti per l'utente corrente
```

### Creazione

```bash
gh pr create                     # interattivo
gh pr create --fill              # usa titolo + body dal commit
gh pr create --title "..." --body "..." --base main
```

### Lavorare su una PR

```bash
gh pr checkout 42                # checkout del branch della PR in locale
gh pr review 42 --approve
gh pr review 42 --request-changes -b "..."
gh pr review 42 --comment -b "lgtm"
gh pr comment 42 --body "@dependabot rebase"
```

### Merge / chiusura

```bash
gh pr merge 42 --squash --delete-branch
gh pr merge 42 --merge           # merge commit
gh pr merge 42 --rebase
gh pr merge 42 --auto --squash   # auto-merge quando la CI è verde
gh pr close 42
gh pr reopen 42
```

## Issue

```bash
gh issue list
gh issue view 17
gh issue create --title "..." --body "..."
gh issue comment 17 --body "..."
gh issue close 17 / gh issue reopen 17
```

## Workflow & CI

```bash
gh run list                      # ultime esecuzioni CI
gh run list --workflow ci.yml --limit 5
gh run view <id>
gh run view <id> --log-failed    # log dei soli job falliti
gh run watch                     # segue in tempo reale l'ultima run
gh run rerun <id>
gh workflow list
gh workflow run <name>           # trigger manuale (workflow_dispatch)
```

## Release

```bash
gh release list
gh release view v1.0.0
gh release create v1.0.0 --generate-notes
gh release download v1.0.0
```

## API raw

Per endpoint non coperti dai sotto-comandi.

```bash
gh api user
gh api repos/:owner/:repo/pulls --jq '.[].title'
gh api -X POST repos/:owner/:repo/issues -f title="bug" -f body="..."
```

`:owner` e `:repo` sono placeholder che `gh` risolve dal repo corrente.

## Flag globali utili

- `--json field1,field2` + `--jq '...'` → output JSON parsabile (`jq` syntax
  integrato)
- `--web` → apre la pagina corrispondente nel browser
- `-R owner/repo` → opera su un repo diverso da quello corrente
- `--help` su qualsiasi comando per la reference completa

## Alias & autocompletion

```bash
gh alias set co 'pr checkout'    # gh co 42
gh alias set prs 'pr list --author @me'
gh completion -s bash >> ~/.bashrc   # o -s zsh / fish
```

## Workflow tipici

### Aprire una PR rapida

```bash
git checkout -b feat/qualcosa
# ... commit ...
git push -u origin feat/qualcosa
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```

### Triagiare PR di Dependabot

```bash
gh pr list --author "app/dependabot"
gh pr view <N> --web
# se in conflitto:
gh pr comment <N> --body "@dependabot rebase"
# quando verde:
gh pr merge <N> --squash --delete-branch
```

### Debug di una CI rotta

```bash
gh run list --workflow ci.yml --limit 5
gh run view --log-failed
```

## Gotcha

- **Scope `workflow` mancante**: se una PR modifica file in
  `.github/workflows/`, il merge via CLI fallisce con
  `refusing to allow an OAuth App to create or update workflow ...`. Soluzione:
  `gh auth refresh -s workflow`.
- **Repo non lincato**: in una cartella senza remote GitHub, `gh` chiede di
  scegliere il repo. Usa `gh repo set-default` per fissarlo.
- **Output JSON**: i comandi `list` di default mostrano output testuale
  troncato. Per script usa sempre `--json <campi> --jq '...'`.
