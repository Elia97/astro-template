# Stack tecnologico

Panoramica delle tecnologie del progetto e di come si integrano.

## Requisiti

- **Node.js** ≥ 22.12.0
- **pnpm** (package manager — non usare npm/yarn)

## Astro

[Astro](https://astro.build/) v6, framework MPA con island architecture.

- **Routing file-based** in `src/pages/`: ogni `.astro` / `.md` diventa una
  route.
- **Layout** in `src/layouts/`: componenti che incapsulano `<head>`, meta,
  styles. `BaseLayout.astro` integra `astro-seo` per canonical, OG e link RSS.
- **Endpoint dinamici**: file `.ts` in `src/pages/` esportano `GET`/`POST` ecc.
  (es. `src/pages/rss.xml.ts` per il feed RSS).
- **Static assets**: tutto ciò che sta in `public/` viene servito come-is.

### Configurazione (`astro.config.mjs`)

- `site` → URL canonico (necessario per sitemap, RSS, OG)
- integrazione `@astrojs/sitemap` → genera `sitemap-index.xml` al build
- plugin Vite `@tailwindcss/vite` → integrazione Tailwind v4

## Tailwind CSS v4

Tailwind v4 usa **configurazione CSS-first**: niente `tailwind.config.js`.

- Entry point: `src/styles/global.css`
- Direttive principali:
  - `@import 'tailwindcss';` → carica il framework
  - `@theme { ... }` → definisce i design token (colori, font, spacing) come
    variabili CSS
- Il plugin Prettier `prettier-plugin-tailwindcss` ordina le classi leggendo i
  token da `global.css`.

## TypeScript

Configurazione **molto stretta**. `tsconfig.json` estende
`astro/tsconfigs/strictest` e aggiunge:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `noFallthroughCasesInSwitch`
- `noImplicitReturns`
- `isolatedModules`

Comando di check: `pnpm typecheck` (alias di `astro check`, che fa anche il
diagnostico dei file `.astro`).

## ESLint

ESLint v10 con
[flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
(`eslint.config.js`, `defineConfig` da `eslint/config`).

- `typescript-eslint` preset `strictTypeChecked` + `stylisticTypeChecked`,
  scoped a `**/*.ts`
- type-aware linting via `projectService`
- `eslint-plugin-astro` con `tseslint.parser` per le sezioni `<script>` /
  frontmatter dei file `.astro`
- `eslint-config-prettier` per disabilitare le regole stilistiche in conflitto
  con Prettier

Comandi: `pnpm lint` (check), `pnpm lint:fix` (autofix).

## Prettier

Configurazione: niente semicolons, single quote, `experimentalTernaries`,
`objectWrap: preserve`.

Plugin attivi:

- `prettier-plugin-astro` (formatta `.astro`)
- `prettier-plugin-tailwindcss` (ordina classi Tailwind)

Comandi: `pnpm format` (write), `pnpm format:check` (CI).

## Vitest (unit test)

Test in `test/`, configurazione in `vitest.config.ts`.

```bash
pnpm test            # run singola
pnpm test:watch      # watch mode
pnpm test:coverage   # con coverage
```

Vitest condivide la pipeline di trasformazione con Vite/Astro, quindi supporta
TS e import path identici a quelli del codice.

## Playwright (E2E)

Test in `e2e/`, configurazione in `playwright.config.ts`. Browser configurati:
**chromium** e **firefox**.

```bash
pnpm test:e2e        # headless
pnpm test:e2e:ui     # UI mode
```

In CI gira in un job dedicato (vedi [`ci.md`](./ci.md)).

## Knip

[Knip](https://knip.dev/) trova file, export e dipendenze non usati.
Configurazione in `knip.json`.

```bash
pnpm knip
```

Utile prima di un cleanup: indica codice morto e pacchetti non più necessari.

## Comando aggregato

```bash
pnpm check
```

Esegue in sequenza: `typecheck` + `lint` + `format:check` + `test`. È il quality
gate locale prima di pushare; la CI esegue gli stessi step più build e
Playwright.

## Quality gate riepilogato

| Strumento  | Comando             | Scope                                |
| ---------- | ------------------- | ------------------------------------ |
| TypeScript | `pnpm typecheck`    | tipizzazione, diagnostica `.astro`   |
| ESLint     | `pnpm lint`         | regole lint type-aware, plugin Astro |
| Prettier   | `pnpm format:check` | formattazione                        |
| Vitest     | `pnpm test`         | unit test                            |
| Playwright | `pnpm test:e2e`     | E2E browser (chromium + firefox)     |
| Knip       | `pnpm knip`         | dead code / dipendenze inutilizzate  |
| Astro      | `pnpm build`        | build di produzione in `dist/`       |

## Struttura del progetto

```
.
├── astro.config.mjs       # config Astro + integrazioni
├── tsconfig.json
├── eslint.config.js
├── commitlint.config.js
├── knip.json
├── playwright.config.ts
├── vitest.config.ts
├── public/                # asset statici
├── src/
│   ├── pages/             # routing file-based
│   ├── layouts/           # layout condivisi
│   ├── components/        # componenti riutilizzabili (se presenti)
│   └── styles/global.css  # entry Tailwind v4 + @theme
├── test/                  # unit (Vitest)
├── e2e/                   # E2E (Playwright)
└── .github/
    ├── workflows/         # CI + release-please
    └── dependabot.yml
```
