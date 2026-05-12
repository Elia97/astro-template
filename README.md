# astro-template

> Starter Astro v6 forkabile per siti aziendali, landing page e progetti
> marketing. Filosofia: **fork → compila `.env` → sito pronto**.

## Vision

`astro-template` è una repo personale pensata per essere forkata e usata come
base per realizzare velocemente siti web nel dominio "marketing": presentazioni
aziendali, landing page, siti istituzionali. Il dominio è volutamente piccolo e
ripetitivo, e questo template scommette sul fatto che la maggior parte delle
decisioni tecniche di un sito di questo tipo possa essere automatizzata.

L'obiettivo a lungo termine è che ogni aspetto configurabile — branding,
integrazioni, analytics, form, SEO, i18n — sia attivabile tramite variabili in
un file `.env`, **senza dover modificare il codice**. Chi forka deve solo
personalizzare l'ambiente e fare il deploy.

Cosa **non è**: un framework, un CMS, un design system pubblico. Cosa **è**: uno
starter opinionato che racchiude in un unico repository le scelte e
l'infrastruttura che vale la pena riutilizzare a ogni nuovo progetto.

## Stack

| Area            | Strumento                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build) v6                                                                                                                                                           |
| Styling         | [Tailwind CSS](https://tailwindcss.com) v4 (CSS-first via `@theme`)                                                                                                                       |
| Linguaggio      | TypeScript strict (`astro/tsconfigs/strictest` + extra flags)                                                                                                                             |
| Package manager | [pnpm](https://pnpm.io) (Node ≥ 22.12.0)                                                                                                                                                  |
| Lint / format   | [ESLint](https://eslint.org) v10 (flat config) · [Prettier](https://prettier.io)                                                                                                          |
| Test            | [Vitest](https://vitest.dev) (unit) · [Playwright](https://playwright.dev) (e2e, chromium + firefox)                                                                                      |
| Dead code       | [Knip](https://knip.dev)                                                                                                                                                                  |
| Quality gates   | [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) + [commitlint](https://commitlint.js.org) (Conventional Commits)                   |
| CI / release    | [GitHub Actions](https://docs.github.com/en/actions) · [release-please](https://github.com/googleapis/release-please) · [Dependabot](https://docs.github.com/en/code-security/dependabot) |

Dettagli completi su scelte e configurazione in
[`docs/astro-stack.md`](./docs/astro-stack.md).

## Getting started

```bash
# 1. Forka il repository su GitHub, poi clonalo:
git clone git@github.com:<tuo-user>/astro-template.git
cd astro-template

# 2. Installa le dipendenze
pnpm install

# 3. (Quando esisterà) copia e personalizza .env
cp .env.example .env

# 4. Avvia il dev server
pnpm dev
```

Comandi principali:

| Comando         | Azione                                         |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Dev server su `localhost:4321`                 |
| `pnpm build`    | Build di produzione in `./dist/`               |
| `pnpm preview`  | Anteprima della build di produzione            |
| `pnpm check`    | `typecheck` + `lint` + `format:check` + `test` |
| `pnpm test:e2e` | Test end-to-end Playwright                     |

## Roadmap

La roadmap procede per milestone SemVer: una minor release per ogni fase. Ogni
milestone è una PR `feat:` (o più, raggruppate per scope coerente).

### v0.1.0 — Foundation

> Base solida di sviluppo: stack, qualità, CI, release automation.

- [x] Stack Astro v6 + Tailwind v4 + TypeScript strict
- [x] Quality gates (ESLint, Prettier, Vitest, Playwright, Knip)
- [x] Husky + commitlint (Conventional Commits)
- [x] CI GitHub Actions (`quality` + `e2e`), release-please, Dependabot
- [x] Documentazione operativa in [`docs/`](./docs/)
- [x] README di progetto + roadmap

### v0.2.0 — Design system & theming

> Tutto ciò che è "look & feel" derivabile da `.env` + design tokens, senza
> toccare il CSS.

- [ ] Design tokens (colori, spacing, radius) in `@theme` legati a variabili CSS
- [ ] Tipografia configurabile via env (`PUBLIC_FONT_HEADING`,
      `PUBLIC_FONT_BODY`)
- [ ] Palette brand via env (`PUBLIC_BRAND_PRIMARY`, `PUBLIC_BRAND_ACCENT`, ...)
- [ ] Dark mode opt-in (`PUBLIC_ENABLE_DARK_MODE`)
- [ ] View Transitions di Astro abilitate di default
- [ ] `.env.example` annotato con tutti i token disponibili

### v0.3.0 — Component library

> Primitive UI riusabili: il livello "atomi/molecole" su cui costruire le
> sezioni marketing.

- [ ] `<Button>` con varianti (primary/secondary/ghost) e `as` polymorphic
- [ ] `<Container>`, `<Section>`, `<Stack>`, `<Grid>` (layout helpers)
- [ ] `<Card>` (base per testimonials, pricing, feature)
- [ ] `<Icon>` via [`astro-icon`](https://github.com/natemoo-re/astro-icon) +
      set Lucide preconfigurato
- [ ] `<Picture>` wrapper su `astro:assets` con preset di ottimizzazione

### v0.4.0 — Sezioni marketing

> Le sezioni "ready-to-compose" tipiche di una landing aziendale.

- [ ] `<NavBar>` configurabile (logo + voci da config)
- [ ] `<Footer>` con info azienda da env (indirizzo, P.IVA, social)
- [ ] `<Hero>` (varianti: split, centered, with-image)
- [ ] `<Features>` (grid 2/3/4 colonne)
- [ ] `<Pricing>` con tier configurabili
- [ ] `<Testimonials>`, `<FAQ>`, `<CTA>`, `<ContactForm>`

### v0.5.0 — SEO & content

> Tutto ciò che riguarda indicizzazione, anteprime social e contenuti
> strutturati.

- [ ] OG image dinamiche generate a build time
- [ ] Structured data JSON-LD (`Organization`, `LocalBusiness`, `FAQPage`,
      `BreadcrumbList`)
- [ ] `robots.txt` generato da env (indicizzazione on/off per ambiente)
- [ ] Content Collections per pagine statiche e (opzionale) blog
- [ ] Template `blog/[slug].astro` opzionale, attivabile via env

### v0.6.0 — Integrazioni env-driven

> Pattern unificato per attivare/disattivare integrazioni esterne via `.env`,
> **senza toccare il codice**.

- [ ] Pattern `getProvider()` con auto-detect dalle env
- [ ] Analytics: GA4, Plausible, Umami, Fathom (selezione via
      `PUBLIC_ANALYTICS_PROVIDER`)
- [ ] Form: Formspree, Web3Forms, Netlify Forms
- [ ] Newsletter: Resend, Buttondown, ConvertKit
- [ ] Cookie consent GDPR-compliant
- [ ] (Opzionale) CMS headless: Decap, Sanity, Storyblok

### v0.7.0 — i18n, A11y, Performance

> Production-readiness: multilingua, accessibilità, performance budget.

- [ ] `@astrojs/i18n` con locale configurabile via env
- [ ] `<html lang>` derivato da env (al posto dell'attuale hardcoded `en`)
- [ ] Audit accessibilità (axe) nei test E2E
- [ ] Lighthouse CI nei workflow (budget ≥ 95 su tutte le categorie)
- [ ] Image optimization patterns documentati (formato, lazy, priority)
- [ ] Preload critical resources

### v1.0.0 — Production-ready

> API stabili, breaking change minimi, repo pronta per essere forkata da terzi.

- [ ] 1–2 siti showcase deployati e linkati
- [ ] CHANGELOG ripulito e API surface documentata
- [ ] Guida di migrazione per chi parte da uno starter Astro vanilla
- [ ] `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- [ ] Tag `v1.0.0` con release notes complete

## Documentazione

Guide operative dettagliate per ogni area:

- [`docs/astro-stack.md`](./docs/astro-stack.md) — stack tecnico esteso
- [`docs/git-workflow.md`](./docs/git-workflow.md) — convenzioni Git e
  Conventional Commits
- [`docs/gh-cli.md`](./docs/gh-cli.md) — uso di `gh` CLI
- [`docs/dependabot.md`](./docs/dependabot.md) — configurazione e triage
  Dependabot
- [`docs/release-please.md`](./docs/release-please.md) — versioning e release
  automation
- [`docs/ci.md`](./docs/ci.md) — pipeline GitHub Actions
