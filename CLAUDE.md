Template Astro riutilizzabile (uso personale/freelance). Le regole sotto `[HARD]` non sono negoziabili — non aggirarle per comodità, anche se sembrano bloccare un task.

## Stack e convenzioni

- **Package manager**: solo pnpm via corepack — versione pinnata in `packageManager` (`package.json`). Non usare npm/yarn, non installare pacchetti globalmente.
- **Node**: versione pinnata in `.nvmrc` — rispettala, non assumere una versione diversa.
- **Formatter/linter**: solo Biome (`biome.json`) — niente ESLint/Prettier. Stile: 2 spazi, apici singoli, niente `;`, virgole finali.
- **TypeScript**: `astro/tsconfigs/strictest`. Se `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` segnalano un errore, risolvilo nel codice — non allentare la config per farlo sparire.
- **Rendering**: `output: "server"` — le pagine sono SSR di default. Le pagine che devono restare statiche hanno `export const prerender = true` esplicito nel frontmatter.
- **Deploy**: Vercel, tramite `@astrojs/vercel`.

## Workflow [HARD]

- Commit: Conventional Commits, validati da commitlint sull'hook `commit-msg` di lefthook (`type(scope): subject`). Un commit che non rispetta il formato viene rifiutato dall'hook — non aggirarlo con `--no-verify`.
- Prima di considerare un task concluso, esegui `pnpm run ci` (Biome check + type-check, non modifica file) — deve passare pulito.
- L'hook `pre-commit` formatta automaticamente i file staged con Biome: è normale che i file vengano riscritti al commit, non è un errore.

## Sviluppo

Avvia il dev server in background:

```
astro dev --background
```

Gestiscilo con `astro dev stop`, `astro dev status`, `astro dev logs`.

## Documentazione

Documentazione completa di Astro: https://docs.astro.build

Consultala prima di lavorare su:

- [Routing, pagine dinamiche, middleware](https://docs.astro.build/en/guides/routing/)
- [Componenti Astro](https://docs.astro.build/en/basics/astro-components/)
- [Componenti React/Vue/Svelte/altri framework](https://docs.astro.build/en/guides/framework-components/)
- [Contenuti e content collections](https://docs.astro.build/en/guides/content-collections/)
- [Stili e Tailwind](https://docs.astro.build/en/guides/styling/)
- [Internazionalizzazione](https://docs.astro.build/en/guides/internationalization/)
