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

### Configurazione (`astro.config.ts`)

- `site` → URL canonico (necessario per sitemap, RSS, OG)
- integrazione `@astrojs/sitemap` → genera `sitemap-index.xml` al build
- plugin Vite `@tailwindcss/vite` → integrazione Tailwind v4
- `env.schema` → schema tipizzato `astro:env` (vedi sezione _Theming via env_)
- `fonts` → 3 famiglie configurate via `astro:font` (sans / serif / mono)

## Tailwind CSS v4

Tailwind v4 usa **configurazione CSS-first**: niente `tailwind.config.js`.

- Entry point: `src/styles/global.css`
- Direttive principali:
  - `@import 'tailwindcss';` → carica il framework
  - `@import './theme.css';` → importa i design token del tema
  - `@theme inline { ... }` → aggancia i token Tailwind alle CSS variables del
    tema (es. `--color-primary: var(--primary)`)
  - `@custom-variant dark (&:is(.dark *))` → abilita il modificatore `dark:`
- Il plugin Prettier `prettier-plugin-tailwindcss` ordina le classi leggendo i
  token da `global.css`.

## Theming

Il template adotta un modello **ispirato a shadcn/ui** ma adattato ad Astro
puro: token semantici (background, foreground, card, primary, muted, accent,
destructive, …) definiti come CSS variables, agganciati a utility Tailwind via
`@theme inline`.

### Dove va cosa

| Dove                     | Cosa contiene                                                                           | Chi lo modifica                                  |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/styles/theme.css`   | Tutti i colori del tema (light + dark), `--radius`, `--shadow-*`, font stack di default | il consumer, **per modificare il look del sito** |
| `src/styles/global.css`  | Setup Tailwind + `@theme inline` + `@layer base`                                        | raramente toccato                                |
| `.env`                   | Provider + nome dei font, flag `dark_mode` e `view_transitions`                         | il consumer, ad ogni fork                        |
| `astro.config.ts`        | Schema `astro:env`, registrazione fonts via `astro:font`                                | il manutentore del template                      |
| `src/lib/env.ts`         | Helpers `envField` + parser `.env` per leggerlo in `astro.config.ts`                    | il manutentore                                   |
| `src/lib/theme/fonts.ts` | Tipi, default e builder per le FontFamily                                               | il manutentore                                   |

### Filosofia env-driven

Solo **decisioni di alto livello** sono via env. Per i colori, una palette
intera è una cosa difficile da esprimere in poche variabili: lo lasciamo come
codice CSS modificabile direttamente. La filosofia: _fork → `.env` + edit di
`theme.css` → sito pronto_. Il `.env` non sostituisce il CSS, ne è
complementare.

### Schema env

Le variabili pubbliche sono dichiarate in `astro.config.ts` via `envField` e
accedute con `import { ... } from 'astro:env/client'`.

| Variabile                        | Tipo                                     | Default               | Effetto                                       |
| -------------------------------- | ---------------------------------------- | --------------------- | --------------------------------------------- |
| `PUBLIC_SITE_URL`                | string                                   | `https://example.com` | URL canonico del sito (sitemap, OG, RSS)      |
| `PUBLIC_FONT_SANS_PROVIDER`      | enum `google` \| `fontsource` \| `local` | `google`              | Provider per il font sans                     |
| `PUBLIC_FONT_SANS_NAME`          | string                                   | `Inter`               | Nome del font sans                            |
| `PUBLIC_FONT_SANS_LOCAL_DIR`     | string                                   | `""`                  | Path in `src/assets/fonts/` se `local`        |
| `PUBLIC_FONT_SERIF_*`            | come sopra                               | `Lora`                | Font serif                                    |
| `PUBLIC_FONT_MONO_*`             | come sopra                               | `JetBrains Mono`      | Font mono                                     |
| `PUBLIC_ENABLE_DARK_MODE`        | boolean                                  | `true`                | Inietta script anti-FOUC e usa classe `.dark` |
| `PUBLIC_ENABLE_VIEW_TRANSITIONS` | boolean                                  | `true`                | Inserisce `<ClientRouter />` in BaseLayout    |

### Font local: convention sui file

Quando `PUBLIC_FONT_*_PROVIDER=local`, il template cerca in
`src/assets/fonts/<dir>/` i file con questi nomi (i mancanti vengono ignorati):

```
Regular.woff2       (400 normal)
Italic.woff2        (400 italic)
Bold.woff2          (700 normal)
BoldItalic.woff2    (700 italic)
```

Se la dir è vuota o non esiste, la build fallisce con errore esplicito.

### Dark mode

Tutte le regole `.dark { ... }` sono in `theme.css`. Se
`PUBLIC_ENABLE_DARK_MODE=true`, `BaseLayout.astro` inietta uno script inline
anti-FOUC che legge `localStorage.theme` (fallback su `prefers-color-scheme`) e
applica la classe `.dark` su `<html>` _prima_ del render del body.

Se `false`, lo script non viene proprio renderizzato e le regole `.dark` in
`theme.css` restano dead code.

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
├── astro.config.ts       # config Astro + integrazioni
├── tsconfig.json
├── eslint.config.js
├── commitlint.config.js
├── knip.json
├── playwright.config.ts
├── vitest.config.ts
├── public/                # asset statici (favicon ecc.)
├── src/
│   ├── assets/
│   │   └── fonts/         # font self-hosted (PROVIDER=local)
│   ├── lib/
│   │   ├── env.ts         # helpers envField + parser .env
│   │   └── theme/
│   │       └── fonts.ts   # FONT_PROVIDERS, FONT_DEFAULTS, buildFontConfig
│   ├── pages/             # routing file-based
│   ├── layouts/           # layout condivisi
│   ├── components/        # componenti riutilizzabili (se presenti)
│   └── styles/
│       ├── global.css     # setup Tailwind v4 + @theme inline
│       └── theme.css      # design tokens del tema (colori, radius, shadow)
├── test/                  # unit (Vitest)
├── e2e/                   # E2E (Playwright)
└── .github/
    ├── workflows/         # CI + release-please
    └── dependabot.yml
```
