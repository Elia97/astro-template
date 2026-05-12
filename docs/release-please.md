# release-please

[release-please](https://github.com/googleapis/release-please) automatizza
versioning, changelog e creazione delle GitHub Release a partire dai
Conventional Commits.

## Come funziona

1. Su ogni push a `main`, il workflow analizza i commit dall'ultima release.
2. Se trova commit rilevanti, apre (o aggiorna) una **Release PR** che:
   - bumpa la versione in `package.json`
   - aggiorna `CHANGELOG.md`
   - raggruppa i cambiamenti per tipo (Features, Bug Fixes, …)
3. Quando la Release PR viene mergiata, release-please:
   - crea il **tag** Git
   - crea la **GitHub Release** con le note generate

Tu non devi mai bumpare versioni o scrivere il changelog a mano.

## Regole di bump

La versione segue [Semantic Versioning](https://semver.org/lang/it/):

| Tipo di commit                                                     | Bump                     |
| ------------------------------------------------------------------ | ------------------------ |
| `fix:`                                                             | patch (x.y.**Z**)        |
| `feat:`                                                            | minor (x.**Y**.0)        |
| `feat!:` / `BREAKING CHANGE`                                       | major (**X**.0.0)        |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:`, `build:` | nessun bump (di default) |

I tipi che non triggherano un bump compaiono comunque nel changelog se
configurati come `extra-types` nella configurazione di release-please.

## Workflow GitHub Actions

`.github/workflows/release-please.yml` esegue l'azione ufficiale a ogni push su
`main`. La PR di release viene riaperta/aggiornata automaticamente fino al
merge.

## Flusso tipico

```
commit feat: add X       ─┐
commit fix: bug Y         │── viene aperta una Release PR
commit chore: dep bump   ─┘     che bumpa minor (per la feat)
                                e mette feat + fix nel changelog

merge della Release PR  ──── tag v1.2.0 + GitHub Release v1.2.0
```

## Interazione con Dependabot

Le PR di Dependabot usano il tipo `chore(deps)`, quindi **non triggerano un bump
di versione** ma compaiono nel changelog solo se configurate per farlo. Questo è
il comportamento desiderato: gli aggiornamenti di dipendenze non dovrebbero
rilasciare una nuova versione del progetto, a meno che non si voglia
esplicitamente.

## Forzare un rilascio

Se serve rilasciare anche senza commit rilevanti (es. dopo solo chore/docs), si
può usare il footer:

```
chore: release as 1.2.0

Release-As: 1.2.0
```

oppure committare con tipo `feat`/`fix` come opportuno.

## Modificare la Release PR

Si possono pushare commit sulla Release PR (es. per correggere il changelog), ma
di solito non è necessario: la configurazione di release-please dovrebbe coprire
i casi normali.

## Gotcha

- **Permessi GitHub Actions sulla repo (setup one-time)**: di default le repo
  GitHub appena create non permettono ai workflow di aprire PR. Senza
  intervento, la prima esecuzione di release-please fallisce con
  `GitHub Actions is not permitted to create or approve pull requests`.
  Soluzione, una volta sola per ogni nuova repo:
  - `Settings → Actions → General → Workflow permissions`
  - selezionare **Read and write permissions**
  - spuntare **Allow GitHub Actions to create and approve pull requests**
  - salvare; eventualmente rilanciare la run fallita con `gh run rerun <id>`.

- **Commit non-Conventional**: vengono ignorati. Se nessun commit rispetta la
  spec, nessuna Release PR viene aperta.

- **Squash merge**: assicurarsi che il messaggio di squash usato nel merge sia
  esso stesso Conventional. La maggior parte delle UI di GitHub propone come
  default il titolo della PR, che è già Conventional se la PR è stata nominata
  correttamente.

- **Versione iniziale**: a seconda della configurazione dell'action, la prima
  release può partire da `1.0.0` di default. Per garantire una prima release
  `0.x.y` (tipico per progetti in early stage), aggiungere il footer
  `Release-As: 0.1.0` al messaggio del commit di squash della prima PR `feat:`.
  Con `gh`:

  ```bash
  gh pr merge <N> --squash --delete-branch --body $'Release-As: 0.1.0'
  ```

  Da quel momento in poi il bump è automatico (`feat:` → minor, `fix:` → patch):
  il footer serve solo per la prima release.
