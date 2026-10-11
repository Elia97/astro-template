# Architettura

## Stack

- **Framework**: [Astro](https://astro.build) 7, `output: "static"` (prerenderizzato di default) con `@astrojs/vercel` come adapter di deploy — è lui a fornire il server, quindi l'azione di contatto e ogni rotta `prerender = false` sono on-demand a prescindere dalla modalità di output. La toolchain e le regole che la governano — pnpm e corepack, Node, Biome, `astro/tsconfigs/strictest`, la deroga `prerender = false` — stanno in `CLAUDE.md` § Stack e convenzioni.
- **`@types/node` è una devDependency diretta di proposito**, anche se nessuno lo importa a mano. Il tipo `UserConfig` di Vite lo tiene come peer: lasciato alla risoluzione transitiva, pnpm installa una copia di Vite per astro e un'altra per vitest, e la chiave `test` che `vitest/config` aggiunge a `UserConfig` non arriva mai al tipo che `getViteConfig()` accetta — a quel punto `vitest.config.ts` non passa il typecheck con «'test' does not exist in type 'UserConfig'». Dichiararlo fissa un peer solo per entrambi. Non toglierlo come inutilizzato.
- **Deploy**: Vercel. La produzione esce solo da un tag di release, mai da un push su `main`: `ignoreCommand` in `vercel.json` lancia `scripts/vercel-ignore-build.sh`, quindi l'integrazione git produce soltanto preview. Vedi `docs/guides/deploy-ops.md` § Modello di deploy.
- **Immagini**: gli asset locali vanno sotto `src/assets/**` e passano da `astro:assets`, con `sharp` in `dependencies`. La cartella porta solo `src/assets/placeholder.jpg`, il segnaposto del contenuto che `pnpm gen:section` scrive con l'opzione immagine. `src/assets/**/*.svg` è già escluso dalla formattazione, dal preset che `biome.json` estende. Vedi `docs/guides/rendering-performance.md` § Immagini.
- **Gate di qualità**: cinque, e ognuno copre un momento che gli altri non coprono; niente arriva in produzione senza passarli tutti. Vedi `docs/guides/deploy-ops.md` § La catena dei gate.
- **I gate `check:*`, i generatori di `pnpm gen`, `doctor` e le verifiche di build e di produzione — `perf:bundle`, `smoke:prod`, `analytics:verify`, `lhci` e `gen:icons` — vengono da `@elia97/officina`**, una devDependency con sorgenti e test in `Elia97/officina`: si correggono lì e arrivano qui aggiornando la dipendenza, mai con una copia in `scripts/`, che divergerebbe alla prima modifica. Dallo stesso pacchetto arrivano le due configurazioni che ogni progetto avrebbe identiche — `biome.json` e `lefthook.yml` non fanno che estenderne i preset — e i passi dei workflow, che sono composite action riferite a un tag di versione: girano dentro il job che le chiama, quindi il nome del check, l'`environment` e i segreti restano di questo repository. Quello che cambia da un progetto all'altro — URL del sito, colore delle icone, budget di bundle, intestazioni attese, controlli di smoke propri — si dichiara in `officina.config.ts` alla radice, e qui bastano `siteUrl`, `icons.background` e le `features` perché per il resto i default del pacchetto sono i valori di questo template. `doctor`, dentro `pnpm run ci`, misura quanto di tutto questo è davvero in piedi: agganci dei generatori, ancoraggi dell'iniezione, script, dipendenze e strumenti, residui di ciò che è uscito, preset, workflow con il riferimento fissato e Dependabot, e `officina.config.ts`. Cosa invece resta al pre-volo dei generatori sta in `docs/guides/content-collections.md` § Punti di iniezione dei generatori.
- **Protezione dagli abusi**: tre livelli sull'azione pubblica, dal più economico — honeypot applicativo, rate limit in memoria e Vercel BotID Basic (in sola osservazione finché `BOTID_ENFORCE=true`). Vedi `docs/guides/forms-email.md` § Protezione dagli abusi.
- **Politica di scansione**: `src/lib/seo/crawl-policy.ts` è la fonte unica di verità su cosa resta fuori dalla ricerca, letta dal filtro della sitemap, da `robots.txt`, dalla head (il meta `noindex` e gli hreflang) e dal middleware. Vedi `docs/guides/seo.md` § Sitemap e robots.
- **Consenso e analytics**: spenti se non configurati — senza **entrambi** un id di container GTM e un id di sito iubenda il layout non rende nessun CMP, nessun tag e nessun cookie. Accenderli non richiede nessuna modifica alla CSP: gli host di GTM, GA4 e iubenda stanno già in `src/lib/csp/directives.ts`. Un tag che il cliente aggiunge dopo, dal pannello GTM, può invece caricare host che lì non ci sono: la tabella tag → host sta nella guida. Vedi `docs/guides/deploy-ops.md` § Tracciamento e Consent Mode v2.
- **Regione delle funzioni**: `fra1` (`vercel.json`). Lasciata vuota, Vercel usa `iad1` e ogni rotta SSR e ogni azione attraversano l'Atlantico due volte.

## Struttura del repository

Ogni percorso porta uno di cinque ruoli. Le etichette esistono per quello che permettono di
**saltare**: la machinery è circa due terzi dell'albero, e un progetto nuovo non la tocca.

- `machinery` — il template che funziona. Si apre quando qualcosa si rompe, non prima.
- `config` — la forma resta, i valori sono tuoi.
- `chrome` — arredo di pagina che si tiene e si ristila.
- `seed` — dove comincia il tuo codice. Non è una demo da cancellare: i generatori scrivono
  esattamente in questi percorsi, quindi `pnpm gen:section` li estende.
- `example` — un riferimento svolto, da riscrivere o cancellare del tutto.

`seed` ed `example` sono la distinzione che vale la pena capire, perché tirano in direzioni
opposte. `src/content/homepage/hero.yml` è example: il copy vero lo sostituisce.
`src/lib/schemas/homepage/` è seed: `gen:section` aggiunge un file in quella cartella e inietta nel
barrel accanto. Cancellare un percorso seed non sfoltisce il progetto, rompe un generatore.

```text
src/
  pages/       # routing basato sui file                                 example
               #   robots.txt, site.webmanifest, 404, 500                machinery
  layouts/     # document.astro: guscio (lang, head, tema, router)       machinery
               #   main.astro: header, footer e tracciamento sul guscio  chrome
  components/
    head/      # metadati, icone, manifest, script pre-paint             machinery
    ui/        # design system (cva + cn), zero JS lato client           machinery
               #   non usate dal template, pronte per i progetti:
               #   badge, breadcrumb, cta-banner, reveal, select         machinery
    forms/     # binder di invio, errori di campo, honeypot, BotID       machinery
    layout/    # header, footer, nav mobile, skip-link                   chrome
    contact/   # riferimento svolto: un form dietro un'azione            example
    legal/     # riferimento svolto: una pagina legale                   example
    homepage/  # le sezioni della homepage                               example
  lib/         # logica senza markup — strati foglia (regola sotto)
    seo/       #   json-ld, crawl-policy, manifest                       machinery
    forms/     #   honeypot, honeypot-schema, rate-limit, form-fields    machinery
    emails/    #   layout: cornice, escapeHtml, detailRow                chrome
    overlay/   #   trap-focus, scroll-lock                               machinery
    motion/    #   ciclo di vita delle animazioni lato client            machinery
    a11y/      #   route-focus (ripristino del focus dopo lo swap)       machinery
    consent/   #   gate del consenso e CMP iubenda                       machinery
    analytics/ #   GTM dietro il gate, ponte verso dataLayer             machinery
    csp/       #   direttive, hash degli script inline, integrazione     machinery
    legal/     #   documenti legali ospitati (iubenda)                   machinery
    content/   #   lettori di sezioni e voci consapevoli della lingua    machinery
    vendor/    #   client di terze parti (brevo)                         machinery
    schemas/   #   schemi delle content collection                       seed
    site.ts    #   identità del sito, fonte unica                        config
    company.ts #   soggetto giuridico, fonte unica                       config
    utils.ts   #   cn()                                                  machinery
    contact.ts, homepage.ts # i moduli di dominio dell'esempio svolto    seed
  types/       # dichiarazioni ambient di Window per i global del browser machinery
  i18n/        # href, locales, path, route-segments, translate, ui      machinery
               #   strings/<lingua>.ts, segments-by-locale.ts            config
  actions/     # l'azione di contatto; gli handler sono esportati per
               #   nome, così l'orchestrazione è testabile               seed
  emails/      # le email delle azioni, una per modulo                   seed
  content/     # dati delle collection                                   example
  assets/      # immagini locali; placeholder.jpg per gen:section        seed
  styles/      # tokens.css — la superficie del rebranding               config
               #   light, dark, globals                                  machinery
  middleware.ts # X-Robots-Tag, e la CSP dell'HTML reso a richiesta      machinery
test/          # infrastruttura di test, mai inclusa nel bundle          machinery
  stubs/       # i moduli virtuali astro:*, risolti dagli alias di vitest
  helpers/     # fixture e mock condivisi (handler delle azioni)
  pages/       # i test delle rotte di src/pages/, dove Astro li costruirebbe come pagine
  container.ts # helper della Container API per rendere i componenti .astro
public/        # asset statici serviti così come sono (favicon, icone del manifest, og-default.png segnaposto)
docs/          # i documenti tecnici del progetto: ROADMAP (milestone, sotto-task, giornate) e
               #   questo file. Brief, decisioni, stima e verbali stanno nel sistema di lavoro,
               #   fuori dal repo; i blueprint delle milestone li porta il plugin `metodo`
  guides/      # riferimenti di pattern per dominio, consultati dagli agenti verticali (sotto)
scripts/       # bootstrap-github, vercel-ignore-build — mai importati da src/
.claude/       # settings.json, i comandi permessi e vietati; agenti, skill e hook
               #   arrivano dal plugin `metodo`
```

### I domini

Percorsi, agente e guida coincidono per costruzione, ed è il percorso a dire chi possiede un file.

**[HARD] Questa tabella esiste qui e in nessun altro posto.** La leggono `/metodo:milestone` per suggerire
un agente per issue, `/metodo:pr` per sceglierlo, e `metodo.md` del plugin per dire quale guida serve:
tutti e tre ci rimandano invece di ricopiarla, perché tre copie da tenere allineate a mano sono tre
copie che divergono.

| Dominio | Percorsi | Agente | Guida |
|---|---|---|---|
| Content collection, schemi Zod, MDX/Markdown, i18n | `src/content/**`, `src/lib/content/**`, `src/lib/schemas/**`, `src/i18n/**` | `content-agent` | `content-collections.md` |
| Componenti, isole interattive, markup e accessibilità | `src/components/**` (non di contenuto), `src/layouts/**`, `src/lib/overlay/**`, `src/lib/a11y/**`, `src/styles/**` | `ui-agent` | `ui-components.md` |
| Meta tag, JSON-LD, sitemap e robots, OG | `src/lib/seo/**`, `src/components/head/**` | `seo-agent` | `seo.md` |
| Form, Astro Action, email | `src/actions/**`, `src/emails/**`, `src/lib/emails/**`, `src/lib/forms/**`, `src/lib/vendor/**` | `forms-agent` | `forms-email.md` |
| Prerender e SSR, immagini, animazioni, bundle | `astro.config.mjs`, `src/lib/motion/**`, `prerender` | `perf-rendering-agent` | `rendering-performance.md` |
| Vercel, variabili d'ambiente, deploy, consenso, CSP | `vercel.json`, `scripts/vercel-ignore-build.sh`, `src/middleware.ts`, `src/lib/csp/**`, `src/lib/consent/**`, `src/lib/analytics/**`, `src/lib/legal/**` | `ops-agent` | `deploy-ops.md` |
| Nessuno dei precedenti | refactor generico, tooling | `general-purpose` | — |

La regola per un dominio nuovo: **la machinery va nella cartella del suo dominio; la configurazione
trasversale e il seed restano piatti.** E se nasce un dominio, nasce con la sua riga qui.

Cosa resta piatto, e perché non è una svista:

- `site.ts` e `company.ts` sono le due fonti uniche di configurazione, importate da ovunque: una
  cartella aggiungerebbe un salto ai file più letti del repo;
- `utils.ts` è `cn()`, importato da quasi ogni componente;
- `contact.ts`, gli strati dati delle pagine a sezioni come `homepage.ts` e `schemas/` restano piatti
  perché sono `seed`, non perché spostarli costerebbe: i generatori li raggiungono per percorso,
  derivato dal nome della collection, e quei percorsi sono dove atterrano le sezioni di un progetto
  vero. Metterli sotto qualcosa tipo `example/` farebbe scrivere a `pnpm gen:section` del codice di
  progetto dentro una cartella che si chiama come una demo.

**[HARD]** I ruoli sono un aiuto alla lettura, non un confine di import: il codice `example` importa
`machinery` liberamente, e a vincolare la direzione sono le regole di stratificazione della sezione
seguente. Non trasformare un'etichetta in una regola di lint — le etichette descrivono un'intenzione
per una persona, ed è esattamente l'intenzione che un progetto nuovo cambia.

## Stratificazione dei sorgenti

`src/` è il confine di tutto ciò che la build dell'applicazione mette nel bundle: il codice di
runtime non vive mai fuori di lì, gli strumenti non vivono mai dentro. Dentro `src/` le dipendenze
vanno in una direzione sola:

- `lib/` — strati foglia: nessun import dall'albero di rendering (niente `.astro`, niente layout o
  pagine). `site.ts` è la fonte unica dei metadati del sito e dei contenuti della chrome; `motion/`
  possiede il ciclo di vita delle animazioni lato client.
- `components/` consuma `lib/`. `components/layout/` è l'arredo di pagina, guidato interamente da
  `SITE` (nav, CTA, legali, microcopy) e da `COMPANY` (l'identità legale): nessun contenuto fisso.
- `layouts/` compone i componenti nel guscio del documento; `pages/` parla ai layout, mai
  direttamente a `head.astro`.

**[HARD]** Non è solo descritto, è imposto: `boundaries` in `.fallowrc.jsonc` mappa queste zone e
`pnpm run check:deadcode`, dentro `pnpm run ci`, fallisce su un attraversamento. La direzione che conta è quella che la
prosa continuava a perdere: un componente non può risalire dentro un layout. Farlo inverte la
composizione e rende il componente inutilizzabile in qualsiasi altro layout — che è esattamente
come le pagine legali erano andate alla deriva prima che il controllo esistesse.

## I punti di aggancio dei template derivati

Un template derivato, come `ecommerce`, riceve la base con il cherry-pick dei commit di vetrina e
la estende solo nei punti qui sotto. In ognuno aggiunge **in coda**, una voce per riga, così un
allineamento successivo non tocca le righe di vetrina. Ogni altra modifica alla base si fa in
vetrina, e arriva al template derivato con il cherry-pick.

- **Azioni**: `src/actions/index.ts` è il solo registro, `server`. Un'azione nuova sta in un suo
  `src/actions/<nome>.ts` e si registra in coda a `server` (`docs/guides/forms-email.md` § Un form
  nuovo dietro un'azione).
- **Dizionari di dominio**: i testi di un dominio stanno in `src/i18n/<dominio>/<lingua>.ts`,
  raccolti in `src/i18n/<dominio>/index.ts`, accanto ai dizionari del sito e fuori da `strings/`.
  `useTranslations(locale, domain)` li risolve insieme a quelli del sito
  (`docs/guides/content-collections.md` § Dizionari di dominio).
- **Layout delle email**: `layout`, `detailRow` ed `escapeHtml` stanno in
  `src/lib/emails/layout.ts`. Un'email nuova li importa da un suo modulo di `src/emails/`, come
  `contact.ts` (`docs/guides/forms-email.md` § Rendering delle email).
- **Guscio del documento**: `src/layouts/document.astro` porta `<html>`, la head, il tema,
  `ClientRouter` e il focus dopo la navigazione. Ha lo slot `head`, lo slot del corpo e la prop
  `class` per `<html>`. Un layout nuovo lo compone con il suo arredo, come fa `main.astro`, e rende
  `<main id="main-content" tabindex="-1">`.
- **CSP a richiesta**: `src/middleware.ts` scrive la policy nell'HTML di ogni pagina con
  `prerender = false`, sugli script che porta. Una pagina nuova non aggiunge niente
  (`docs/guides/deploy-ops.md` § Content-Security-Policy).
- **Origini della CSP**: `BASE` in `src/lib/csp/directives.ts` ha una voce per riga, sotto un
  `biome-ignore format`. Un fornitore nuovo aggiunge le sue origini in coda alla direttiva che gli
  serve, e una direttiva nuova va in coda a `BASE`
  (`docs/guides/deploy-ops.md` § Content-Security-Policy).
- **Liste di configurazione**: `features` in `officina.config.ts` e `coverage.include` in
  `vitest.config.ts` hanno una voce per riga. La seconda porta un `biome-ignore format`, perché Biome
  riporta su una riga un array che ci sta.
- **Politica di scansione**: `ROBOTS_DISALLOWED_PATHS` e `NOINDEX_PATHS` in
  `src/lib/seo/crawl-policy.ts` hanno una voce per riga, sotto un `biome-ignore format`. Un template
  derivato vi aggiunge in coda i percorsi che restano fuori dalla ricerca, come l'accesso, il
  back-office o le pagine non ancora tradotte, e il resto li segue senza altre modifiche: da
  `ROBOTS_DISALLOWED_PATHS` la sitemap e `robots.txt`, da `NOINDEX_PATHS` la sitemap, il meta
  `noindex`, gli hreflang e `X-Robots-Tag` (`docs/guides/seo.md` § Sitemap e robots).

## Primitive di interfaccia — niente React o Radix nello scaffold di base

`src/components/ui/` contiene primitive `.astro` native (button, badge, alert, card, input,
textarea) costruite con le varianti di `cva` e `cn()`: la forma dell'API di shadcn con zero runtime
lato client. È una scelta: sui progetti veri l'attrito di shadcn su Astro veniva specificamente dai
componenti Radix *con stato e basati su portali* dentro le isole, non dallo strato di presentazione.

Se un progetto ha davvero bisogno di un componente con stato (Dialog, Calendar, Accordion), tirare
dentro React e Radix **per quella singola isola** va bene — tenendo a mente questi modi di fallire
già noti, incontrati in produzione e da non riscoprire:

- usa `client:idle`, non `client:visible`, per il contenuto di un portale che da chiuso ha
  dimensione zero: un Dialog chiuso non interseca mai niente, quindi `client:visible` non lo idrata;
- la CSP di Astro ha bisogno di `unsafe-inline` in `style-src` (o della via d'uscita
  `styleDirective`) per gli stili che Radix inietta a runtime;
- le isole non condividono stato: il ponte fra markup statico e isola si fa esplicitamente con
  attributi `data-*`.

## Pianificazione e agenti verticali

Le milestone si seminano come issue GitHub (`/metodo:milestone`) e si implementano una issue alla volta
(`/metodo:pr <numero-issue>`) grazie agli agenti verticali del plugin `metodo` — vedi la sezione «Pianificazione e
agenti verticali» di `metodo.md`, nel plugin.
