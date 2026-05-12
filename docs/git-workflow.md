# Git workflow

Convenzioni e tooling per i commit e i branch nel progetto.

## Pipeline di lavoro

Regola di base: **nessun commit diretto su `main`**. Ogni cambiamento, anche
piccolo, passa attraverso:

1. creazione di un branch a partire da `main` aggiornato;
2. uno o più commit con messaggi Conventional Commits;
3. push del branch sul remote;
4. apertura di una Pull Request verso `main`;
5. **squash and merge** della PR (è l'unica strategia di merge usata);
6. eliminazione del branch dopo il merge.

`main` resta così sempre lineare: un commit per PR, ognuno con messaggio
Conventional Commit. Questo è anche un requisito per il funzionamento corretto
di [release-please](./release-please.md).

```bash
git checkout main && git pull
git checkout -b feat/qualcosa
# ... commit ...
git push -u origin feat/qualcosa
gh pr create --fill
gh pr merge --squash --delete-branch
git checkout main && git pull        # sincronizza il locale dopo il merge
```

## Conventional Commits

Tutti i commit devono seguire la specifica
[Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<type>(<scope>): <subject>

[body opzionale]

[footer opzionale]
```

- `<type>` e `<subject>` sono **obbligatori**
- dopo i due punti **ci deve essere uno spazio** (`chore: ...`, non `chore:...`)
- `<subject>` in minuscolo, senza punto finale, modo imperativo («add», non
  «added»)

### Type ammessi

| Type       | Uso                                    |
| ---------- | -------------------------------------- |
| `feat`     | nuova funzionalità                     |
| `fix`      | bug fix                                |
| `chore`    | manutenzione, setup, dipendenze        |
| `docs`     | solo documentazione                    |
| `style`    | formattazione, niente cambio di logica |
| `refactor` | refactor senza cambio di comportamento |
| `perf`     | miglioramento di performance           |
| `test`     | aggiunta/modifica di test              |
| `build`    | build system, bundler                  |
| `ci`       | configurazione CI                      |
| `revert`   | revert di un commit precedente         |

### Breaking changes

Aggiungere `!` dopo il type/scope **oppure** un footer `BREAKING CHANGE: ...`:

```
feat(api)!: rename `getUser` to `fetchUser`
```

I breaking change bumpano la major version tramite release-please (vedi
[`release-please.md`](./release-please.md)).

### Esempi

```
feat(blog): add tag-based post filtering
fix(layout): correct canonical url when site has trailing slash
chore(deps): bump astro from 6.0.0 to 6.1.0
docs: add architecture overview
refactor(rss): extract feed item builder
```

## Tooling locale

### commitlint

Il file `commitlint.config.js` estende `@commitlint/config-conventional`. Il
controllo è attivato dall'hook `commit-msg` di Husky: se il messaggio non
rispetta la specifica, il commit fallisce.

Errore tipico:

```
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
```

Causa più comune: manca lo spazio dopo i due punti (`chore:setup`).

### Husky

Hook configurati in `.husky/`:

- `pre-commit` → esegue `lint-staged` (ESLint + Prettier sui file in stage)
- `commit-msg` → esegue commitlint sul messaggio

Per saltare gli hook in casi eccezionali si può usare `--no-verify`, ma è
sconsigliato: se un hook fallisce, è meglio investigare la causa.

### lint-staged

Configurato in `package.json`. Applica ESLint e Prettier solo ai file in stage,
così i commit non vengono rallentati dall'analisi dell'intero repo.

## Naming dei branch

Convenzione: `<type>/<descrizione-kebab-case>`, dove `<type>` corrisponde allo
stesso vocabolario dei Conventional Commits.

- `feat/dark-mode`
- `fix/rss-canonical-url`
- `chore/upgrade-tailwind`
- `docs/readme-update`
- `refactor/extract-rss-builder`

Branch a vita breve: nascono da `main` aggiornato, si fondono in `main` via PR e
vengono eliminati subito dopo il merge.

## Operazioni comuni

### Aggiungere un file dimenticato in un commit prima della PR

Due opzioni, entrambe valide finché il branch è personale e non ancora mergiato:

**1. Nuovo commit**

```bash
git add <file>
git commit -m "chore: add missing file"
git push
```

Nella PR ci saranno più commit, ma con lo squash-merge finisce comunque tutto in
un singolo commit su `main`.

**2. Amend del commit precedente (history del branch più pulita)**

```bash
git add <file>
git commit --amend --no-edit
git push --force-with-lease
```

`--force-with-lease` è più sicuro di `--force`: fallisce se qualcun altro ha
pushato sul branch nel frattempo. Usare solo su branch personali, mai su `main`.

### Aggiornare un branch con `main`

Quando `main` avanza e la tua PR mostra "out of date":

```bash
git fetch origin
git rebase origin/main          # history lineare sul branch
git push --force-with-lease
```

In caso di conflitti, Git si ferma su ogni commit problematico:

```bash
# risolvi i conflitti nei file, poi:
git add <file-risolti>
git rebase --continue
# oppure, per abortire:
git rebase --abort
```

### Annullare un commit già mergiato in `main`

```bash
git checkout -b revert/<descrizione>
git revert <sha>                # crea un commit inverso
git push -u origin revert/<descrizione>
gh pr create --fill
```

Mai riscrivere la history di `main`.

## Squash and merge: implicazioni

Visto che ogni PR diventa un singolo commit su `main`:

- il **titolo della PR** deve essere già un Conventional Commit valido, perché
  GitHub di default lo usa come messaggio di squash;
- il body del commit di squash può raccogliere i singoli commit del branch, ma è
  opzionale tenerli;
- non importa quanti commit "intermedi" o "wip" hai sul branch: vengono
  collassati. Puoi lavorare in modo disinvolto in locale e poi affidarti allo
  squash per la pulizia finale.

## Checklist pre-PR

- [ ] Branch creato da `main` aggiornato (`git pull` di recente)
- [ ] `pnpm check` passa in locale (typecheck, lint, format, test)
- [ ] Commit con messaggi Conventional Commits
- [ ] Titolo della PR già in formato Conventional Commit (sarà il messaggio di
      squash)
- [ ] Nessun file di troppo nello stage (`git status`)
