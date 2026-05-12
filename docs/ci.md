# CI / GitHub Actions

Workflow di Continuous Integration e automazioni configurate in
`.github/workflows/`.

## Trigger

La CI gira:

- a ogni **push su `main`**
- a ogni **pull request verso `main`**

Per ogni `ref`, le run precedenti vengono cancellate (`concurrency` +
`cancel-in-progress: true`): solo l'ultima esecuzione di un branch resta attiva.

## `ci.yml`

Due job paralleli.

### Job `quality`

Esegue il quality gate completo sul codice:

1. `pnpm install --frozen-lockfile` — installa esattamente ciò che è in
   `pnpm-lock.yaml`. Fallisce se il lockfile è disallineato dal `package.json`.
2. `pnpm typecheck` — `astro check` (TS + `.astro`).
3. `pnpm lint` — ESLint type-aware.
4. `pnpm format:check` — Prettier in modalità verifica.
5. `pnpm test` — unit test Vitest.
6. `pnpm build` — build di produzione in `dist/`.
7. `pnpm knip` — dead code & dipendenze inutilizzate.
   - `continue-on-error: true`: i warning di Knip non bloccano la CI, ma sono
     comunque visibili nel log.

### Job `e2e`

Esegue i test end-to-end Playwright:

1. Setup identico al job `quality`.
2. `pnpm exec playwright install --with-deps chromium firefox` — scarica i
   browser usati dai test.
3. `pnpm test:e2e` — esegue gli spec in `e2e/`.
4. Upload del report Playwright come artifact (`playwright-report/`), retention
   7 giorni, anche su failure (`if: always()`).

Per scaricare il report dopo una run fallita:

```bash
gh run list --workflow ci.yml --limit 5
gh run download <run-id> -n playwright-report
```

## `release-please.yml`

Gira automaticamente su push a `main`. Vedi
[`release-please.md`](./release-please.md) per i dettagli.

## Quality gate locale vs CI

Per evitare di "scoprire" errori in CI, il comando aggregato locale è:

```bash
pnpm check
```

che esegue: `typecheck` + `lint` + `format:check` + `test`. Replica i passi del
job `quality` (manca `build` e `knip`, ma sono veloci da aggiungere se serve).

Per la parte E2E:

```bash
pnpm test:e2e
```

## Debug di una CI rotta

```bash
# elenca le ultime run del workflow CI
gh run list --workflow ci.yml --limit 10

# dettagli di una run specifica
gh run view <run-id>

# log dei soli step falliti
gh run view <run-id> --log-failed

# rilanciare una run
gh run rerun <run-id>
```

Le PR mostrano lo stato della CI: `gh pr checks <N>` o `gh pr view <N>`.

## Gotcha

- **Lockfile disallineato**: se `package.json` è stato modificato senza
  aggiornare `pnpm-lock.yaml`, `pnpm install --frozen-lockfile` fallisce.
  Soluzione locale: `pnpm install` e committare il lockfile aggiornato.
- **Cache di pnpm**: `setup-node` con `cache: pnpm` cache-a lo store di pnpm. Se
  servono installazioni pulite, fare una run con cache invalidata (cambia
  versione Node o cache key).
- **Playwright in CI**: i browser devono essere installati a ogni run a meno di
  cacharli; il workflow attuale fa l'install esplicito a ogni run per
  affidabilità.
- **Knip non blocca**: è in `continue-on-error: true` di proposito, per non
  fallire la CI su falsi positivi. Verificare l'output nel log durante i
  cleanup.
- **`CHANGELOG.md` autogenerato vs Prettier**: il `CHANGELOG.md` prodotto da
  release-please usa bullet `*` e doppie newline, formato che Prettier non
  accetta. Senza intervento, il primo commit di rilascio rompe la CI su
  `format:check`. Soluzione: aggiungere `CHANGELOG.md` a `.prettierignore`. È un
  file autogenerato, non ha senso formattarlo a mano.
