# Dependabot

Dependabot apre automaticamente pull request per aggiornare dipendenze npm e
GitHub Actions. È configurato in `.github/dependabot.yml`.

## Configurazione corrente

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    groups:
      dev-dependencies:
        dependency-type: development
        update-types: [minor, patch]
      prod-dependencies:
        dependency-type: production
        update-types: [minor, patch]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

### Cosa significa

- **npm settimanale**, **GitHub Actions mensile**: limita il rumore di PR.
- **Grouping** per minor/patch: tutte le minor/patch dev finiscono in una
  singola PR `dev-dependencies`, lo stesso per `prod-dependencies`. Riduce
  drasticamente il numero di PR.
- **Major bump non raggruppati**: ognuno apre una PR a parte, perché può
  introdurre breaking change e va valutato singolarmente.
- **Limite di 10 PR aperte** per ecosistema npm.

## Anatomia di una PR Dependabot

Ogni PR include:

- titolo Conventional Commit (`chore(deps): bump <pkg> from X to Y`)
- link al changelog/release notes nella descrizione
- commit list con eventuali compatibility score
- supporta comandi interattivi via commento (vedi sotto)

## Comandi interattivi

Commenta sulla PR per pilotare Dependabot:

| Comando                              | Effetto                                               |
| ------------------------------------ | ----------------------------------------------------- |
| `@dependabot rebase`                 | rifà rebase del branch su `main` aggiornato           |
| `@dependabot recreate`               | rigenera la PR da zero (utile dopo modifiche manuali) |
| `@dependabot merge`                  | mergia quando la CI è verde                           |
| `@dependabot squash and merge`       | come sopra, ma squash                                 |
| `@dependabot cancel merge`           | annulla l'auto-merge richiesto                        |
| `@dependabot reopen`                 | riapre una PR chiusa                                  |
| `@dependabot close`                  | chiude la PR (Dependabot non la riaprirà)             |
| `@dependabot ignore this major`      | ignora major future di questa dipendenza              |
| `@dependabot ignore this minor`      | ignora minor future                                   |
| `@dependabot ignore this dependency` | ignora del tutto questa dipendenza                    |

Le direttive `ignore` possono anche essere messe in `dependabot.yml` per essere
persistenti e versionate.

## Strategia di merge

### Patch e minor

Bassi rischi. Se la CI è verde:

- merge diretto, preferendo **squash** (mantiene la history lineare e
  compatibile con release-please).

### Major

Possono contenere breaking change. Procedura:

1. Leggere le release notes linkate nella descrizione della PR.
2. Verificare in CHANGELOG/migration guide se servono cambi di codice.
3. Se necessario, fare `gh pr checkout <N>` e testare in locale
   (`pnpm check && pnpm test:e2e`).
4. Se servono modifiche, committarle direttamente sul branch della PR
   (Dependabot non sovrascriverà se rileva commit dell'utente).
5. Merge solo dopo conferma.

### Conflitti sul lockfile

Quando una PR npm viene mergiata, altre PR npm pendenti spesso vanno in
conflitto su `pnpm-lock.yaml`. Soluzione:

```
@dependabot rebase
```

Dependabot rigenera il lockfile sul branch aggiornato, la CI riparte. Le PR
GitHub Actions di solito non sono affette perché non toccano il lockfile.

### Ordine consigliato quando ce ne sono molte aperte

1. Prima le PR di **GitHub Actions** (non toccano `pnpm-lock.yaml`)
2. Poi le PR **npm**, una alla volta, lasciando rebasare le successive

## Triage da CLI

```bash
# elenco solo PR Dependabot
gh pr list --author "app/dependabot"

# dettaglio + stato CI
gh pr view <N>
gh pr checks <N>

# auto-merge quando CI passa
gh pr merge <N> --auto --squash --delete-branch

# chiedere il rebase
gh pr comment <N> --body "@dependabot rebase"
```

## Gotcha

- **Scope `workflow`**: per mergiare via `gh` PR che modificano
  `.github/workflows/*` serve `gh auth refresh -s workflow`. Vedi
  [`gh-cli.md`](./gh-cli.md).
- **Major bump di GitHub Actions ufficiali**: in genere sicuri se la CI passa,
  ma controllare sempre il changelog (a volte cambiano i nomi degli output o il
  comportamento di default).
- **Lockfile rigenerato**: dopo `@dependabot rebase`, la CI deve ripartire e
  ridiventare verde prima del merge.
- **PR ignorate per sempre**: chiudere manualmente una PR Dependabot non basta a
  fermarla; va usato `@dependabot ignore ...` o configurato `ignore` in
  `dependabot.yml`.
