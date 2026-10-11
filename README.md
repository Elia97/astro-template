# vetrina

Template Astro per siti vetrina, uso personale e freelance: per ogni progetto nuovo si riparte da qui
invece di lavorare dentro `vetrina` stesso. È il primo dei tre template del sistema, con `ecommerce` e `monorepo`.

**È specifico per Vercel.** `vercel.json` porta intestazioni, redirect, rewrite e regione delle
funzioni, l'adapter è `@astrojs/vercel`, il form di contatto passa da Vercel BotID, e la
produzione esce solo da un tag di release (`docs/guides/deploy-ops.md` § Modello di deploy): portarlo
su un altro host non è una riga di configurazione.

**Per avviarlo in locale**, con il Node di `.nvmrc`: `corepack enable && pnpm install`, poi
`pnpm dev`. Gli script stanno in `package.json`; quali girano come gate, e in che ordine, lo dice
`docs/guides/deploy-ops.md` § La catena dei gate.

Il metodo di lavoro — commit e PR, commenti, lingua, pianificazione, agenti verticali — non sta in
questo repository: è il plugin `metodo` e `metodo.md` del repository `Elia97/metodo`, che il sistema
di lavoro importa in ogni progetto. Questo file copre quello che succede *dentro* il repo.

## Come nasce un progetto

Il flusso — cliente, brief, questioni, roadmap, offerta, cancello, trasferimento, milestone — è la
skill `nuovo-progetto` del sistema di lavoro, con il riferimento per stima e domande in
`risorse/conoscenza/avvio-progetto.md`. Qui ci sono solo i passi che avvengono dentro il repo,
che la skill richiama per nome. Il repo nasce **prima** dell'approvazione e non contiene niente di
commerciale: brief, decisioni, stima e verbali stanno nel sistema; qui si scrive solo
`docs/ROADMAP.md`, che arriva come impalcatura vuota di proposito.

### Alla creazione

1. Su GitHub, **«Use this template» → «Create a new repository»**, privato, sotto il tuo account e
   non nell'organizzazione del committente (non `git clone`, che si trascinerebbe dietro la storia
   git e i tag di release di questo repo).
2. Clonalo nella cartella del progetto del sistema (`progetti/<id>/repo/`), poi `corepack enable &&
   pnpm install`: installa dipendenze e hook git (lefthook).
3. **Metti dependabot in pausa**. Il primo giro è già partito: «Use this template» crea il commit
   iniziale con un push su `main`, e GitHub lancia subito Dependabot, un giro per voce di
   `.github/dependabot.yml`, che può aprire una PR prima che la pausa esista. Il template lo tiene
   attivo, quindi la pausa arriva sempre dopo: `open-pull-requests-limit: 0` sul gruppo `officina` e
   sulle due voci che non ne fanno parte (sulle voci del gruppo Dependabot lo rifiuta e scarta
   l'intero file). Poi **committa e pusha**, con release-please già sospeso (passo 4), perché GitHub
   legge quel file dal branch di default e una pausa che resta in locale non mette in pausa niente.
   Pushata la pausa, chiudi le PR del primo giro con `gh pr close <n> --delete-branch`: su uno
   scaffold non personalizzato e senza secret di CI sono rumore. La milestone `foundations` lo
   riattiva.
4. **Sospendi release-please prima del primo push**, cioè prima di pushare la pausa del passo 3. Sul
   commit iniziale è già girato, perché il progetto non è un repository template e il job non salta,
   e non ha aperto niente solo perché «Initial commit» non ha un tipo rilasciabile. Si sospende lato
   GitHub e non nel file, così l'allineamento al template al cancello non trova una differenza
   spuria: `gh workflow disable release-please.yml`. Prima del cancello non c'è niente da
   rilasciare, e fino al passo 8 le Actions non hanno il permesso di aprire la release PR: al primo
   commit rilasciabile la workflow fallirebbe.
5. Nessuna riga di codice applicativo e niente `bootstrap-github.sh`: lo scaffold resta com'è, e il
   ruleset che quello script installa rifiuterebbe i commit diretti su `main` della fase di piano.

### Al cancello

6. Se il committente è un'agenzia, trasferisci il repo alla sua organizzazione, aggiorna `origin`
   (`git remote set-url origin …`) e verifica che l'app Vercel sia installata sull'organizzazione
   di destinazione, altrimenti il collegamento git del progetto si rompe.
7. Riallinea lo scaffold al template corrente, che nel frattempo è cambiato: `git remote add
   template git@github.com:Elia97/vetrina.git`, `git fetch template`, `git diff HEAD
   template/main -- ':!docs' ':!README.md' ':!.github/dependabot.yml'`. Le storie sono scorrelate:
   si legge il diff e si riportano a mano le differenze che contano, non si fa merge.
8. `bash scripts/bootstrap-github.sh` da dentro il clone (serve `gh` autenticato): label di
   dependabot, merge solo in squash, permessi Actions per release-please, e il ruleset su `main` (PR
   obbligatoria, `ci` come check richiesto, branch aggiornato prima del merge, nessun push diretto).
   Si può rilanciare quando si vuole: ogni passo è idempotente. Non ricorrere ad `ADMIN_BYPASS=1`:
   su un progetto cliente rimette `ci` al rango di suggerimento.
9. Collega il repo a un progetto Vercel. L'*Ignored Build Step* non si imposta a mano: lo dichiara
   `ignoreCommand` in `vercel.json`, ed è quello che tiene la produzione legata a un tag di release
   invece che a ogni push. Se il progetto Vercel ce l'ha già impostato dalla dashboard, svuotalo:
   `vercel.json` lo sovrascrive, e due fonti per la stessa regola divergono alla prima modifica.
10. Imposta i secret di release (§ Secret di release, sotto): senza `RELEASE_PLEASE_TOKEN` la
    release PR non riceve mai il check `ci` e non si può mergiare. Poi riaccendi ciò che avevi
    spento: `gh workflow enable release-please.yml`. Dependabot no: lo riattiva la milestone
    `foundations`.
11. `/metodo:milestone 1` semina la Milestone 1 — branding, ambienti, design system, SEO, form,
    consenso, contenuti reali, trascritta nella roadmap dal blueprint `foundations` del plugin
    mentre si scriveva il piano — e `/metodo:pr <numero-issue>` implementa ciascuna delle sue
    issue. Si semina una milestone alla volta: una milestone seminata è un piano congelato. **Il
    rebranding avviene lì**, attraverso PR e commit rilasciabili; farlo a mano prima lo farebbe
    atterrare su `main` come lavoro non tracciato e non rilasciabile. La sezione § Cosa tocca il
    rebranding, sotto, è il riferimento che quelle issue leggono.
12. `.release-please-manifest.json` parte da `{".": "0.0.0"}`, che release-please interpreta come
    «non è ancora stato rilasciato niente» e non come una versione precedente vera: la prima PR di
    release propone quindi `1.0.0` direttamente, da sola, e resta aperta aggiornandosi a ogni `feat`
    e `fix` finché non la si merge, una volta finito il primo blocco di milestone. Il manifest arriva
    a `0.0.0` perché il template non si rilascia: in `release-please.yml` il job salta dove il
    repository è un template, altrimenti manifest, versione e `CHANGELOG.md` del template
    passerebbero al progetto. Nel progetto la condizione è sempre vera e non va toccata.

## Cosa tocca il rebranding

La superficie completa, in un posto solo — la milestone `foundations` la distribuisce su tre issue:

- `package.json#name` (e `release-please-config.json`): trapela nel changelog che release-please
  genera, quindi deve corrispondere al progetto nuovo e non restare `vetrina`;
- `src/lib/site.ts`: nome, url, descrizione, voci di nav, CTA e legali (la chrome si rende da qui, e
  le voci portano chiavi i18n, non testo), più i profili di `SITE.social`, che arriva vuoto: ogni
  profilo aggiunto finisce nel footer e nel `sameAs` del JSON-LD;
- `src/lib/company.ts`: il soggetto giuridico — ragione sociale, telefono (`phone` in E.164 e
  `phoneDisplay` nella forma che si legge), email, indirizzo e partita IVA, più il `logo`
  facoltativo, un file di `public/` su fondo chiaro. Si vedono nella riga legale del footer e nei
  recapiti di `/contatti`, e alimentano il JSON-LD `Organization` della homepage, con la partita IVA
  come `vatID`;
- `src/styles/tokens.css`: l'UNICO file da toccare per il rebranding visivo (primitive oklch grezze;
  i nomi semantici in `light.css` e `dark.css` restano);
- `public/og-default.png`: si sostituisce il segnaposto (1200×630), e con lui le misure in
  `SITE.defaultOgImageSize` e l'alt `seo.defaultOgImageAlt` in `src/i18n/strings/it.ts`;
- `public/favicon.svg` e `public/favicon.ico`: si sostituiscono entrambi, poi `pnpm gen:icons`
  rigenera dall'SVG le tre icone PNG del manifest — `docs/guides/seo.md` § Icone, manifest e
  theme-color dice come sono fatte;
- `SITE.themeColor`: i colori della chrome del browser, da tenere uguali a `--background` in
  `light.css` e `dark.css`;
- `src/lib/site.ts` → `DEFAULT_LOCALE`, se il progetto non parte dall'italiano: la leggono
  `astro.config.mjs` (lingua di default, lingue instradate e sitemap), i moduli che ripiegano sulla
  lingua di default e lo stub dei test. Non copre la chiave di `SITE.localeTags` né il dizionario
  `src/i18n/strings/it.ts`, che si rinomina insieme alla costante che esporta: `src/i18n/ui.ts` ne
  deriva `UIKey` e il tipo di ogni dizionario;
- `vercel.json`: il redirect da `www.example.com` a `example.com`, sul dominio vero e verso l'host
  canonico scelto (`docs/guides/deploy-ops.md` § Checklist per il go-live);
- `src/content/homepage/hero.yml`: il copy vero della homepage.

Quello che resta lo trova il deploy: `pnpm run check:placeholders` elenca, con file e riga, i
segnaposto rimasti in `src/lib/site.ts`, `src/lib/company.ts` e nei dizionari, e il deploy di
produzione si ferma finché ce n'è uno. Un link a `#`, o a una pagina che non esiste, lo ferma prima
la CI, con `pnpm run check:links` sulla build.

## Cosa ti dà lo scaffold

- **Token di design su tre livelli** (`src/styles/`): `tokens.css` (la superficie del rebranding) →
  `light.css` e `dark.css` (nomi semantici) → `globals.css` (l'orchestratore).
- **Primitive di interfaccia** (`src/components/ui/`): `.astro` native, cva e `cn()`, la forma
  dell'API di shadcn, zero JS lato client. Le famiglie composte (card, alert) sono cartelle con un
  barrel `.ts`; il layout vive solo in `Container` e `Section`.
- **Layout di base e SEO** (`src/layouts/`): `document.astro` è il guscio, con la head
  centralizzata, il tema scuro senza FOUC e le view transition; `main.astro` ci aggiunge skip-link,
  header, footer e tracciamento.
- **Pagine a sezioni** (`src/content/homepage/*.yml` per la homepage): un YAML per sezione, accesso
  tipizzato solo tramite `get<Nome>Sections(locale)` — che è anche la cucitura verso un CMS.
  `pnpm gen:collection` ne crea altre.
- **i18n additiva per costruzione**: la lingua di default tiene per sempre URL senza prefisso e file
  di contenuto PIATTI, quindi una seconda lingua non è mai una ristrutturazione (§ Aggiungere una
  lingua, sotto).
- **Impianto SEO**: head modulare (`head/seo.ts` più i suoi sottocomponenti), sitemap e
  `robots.txt`, costruttori di JSON-LD, `X-Robots-Tag: noindex` sui deploy di preview
  `*.vercel.app`, header di sicurezza in `vercel.json`.
- **Stack del form di contatto**: Astro Action, schema zod, rate limiting, fornitore Brevo (che in
  sviluppo non fa niente e in produzione rifiuta), email transazionali e interfaccia accessibile
  (`/contatti`). Le convenzioni sono in `docs/guides/forms-email.md`, la configurazione qui sotto.
- **Pagine di errore e legali**: 404 e 500, più `privacy`, `cookie-policy` e `termini`. Le prime due
  arrivano da iubenda — scaricate e ripulite in fase di build una volta impostato un id di policy, e
  fino ad allora dicono che il documento non è disponibile invece di mostrare una bozza che sembra
  una policy vera. `termini` non ha un corrispettivo ospitato, quindi porta sezioni segnaposto
  scritte a mano dietro un avviso «bozza, da rivedere legalmente».
- **Consenso e analytics, spenti finché non li configuri**: CMP iubenda e GTM dietro un gate di
  consenso, con i default di Google Consent Mode v2 negati (§ Configurare consenso e analytics,
  sotto).
- **Unit test** (vitest e happy-dom): `pnpm test`, collegato a `pnpm run ci`. I moduli virtuali di
  Astro sono stubbati in `test/stubs/` (env, config, i18n), così la logica pura (head e seo, i18n,
  rate-limit, email, fornitori) si testa in fretta. **La soglia del 100% vale su `src/`**, che è la
  logica del prodotto: sotto ci sono i `.ts` più i due `.astro` che portano rami veri, elencati
  nell'`include` di `vitest.config.ts`, e la copertura non guarda altro. Ogni buco voluto porta un
  `v8 ignore` con la sua ragione. La soglia esiste per dare un senso al gate CRAP di `fallow audit`,
  non come numero da inseguire.
- **Analisi di codice morto e architettura** (fallow, solo in sviluppo): `pnpm run check:deadcode`
  e `pnpm run check:health` stanno dentro `pnpm run ci` — `.fallowrc.jsonc` documenta ogni
  esclusione voluta, e il suo blocco `boundaries` trasforma `docs/ARCHITECTURE.md` § Stratificazione
  dei sorgenti in un controllo. `pnpm audit:diff` mette le stesse analisi a gate **limitandole al
  diff di un branch**, ed è quello che lancia `/metodo:pr`; legge la copertura che `pnpm test`
  scrive, e senza quel rapporto la stima dal grafo dei moduli — una funzione che nessun test tocca
  direttamente scende al 40%, e a quel punto basta una complessità di 10 per sforare la soglia CRAP.
  `pnpm run review` non blocca ed esce sempre 0: va letto.

Il perché e il dettaglio stanno in `docs/guides/*.md` e in `docs/ARCHITECTURE.md`.

## Strumenti di Claude Code

Questo repo non porta agenti, comandi né hook: li fornisce il plugin `metodo` (repository
`Elia97/metodo`, con le istruzioni di installazione nel suo README), attivo a livello utente in ogni
cartella. Il `.claude/settings.json` tiene solo i permessi per chi apre la sessione qui dentro.

## Configurare il form di contatto

In sviluppo il form funziona **senza configurazione**: il client Brevo non fa niente ma lo dice, e
il form «riesce» comunque. Per spedire email vere:

1. Copia `.env.example` in `.env` e riempi i valori `CONTACT_*`.
2. Imposta `BREVO_API_KEY` in locale nel `.env` e, per i deploy, nelle impostazioni del progetto
   Vercel (è un segreto solo lato server, mai in git).
3. Verifica DKIM, SPF e DMARC del dominio mittente in Brevo prima del go-live: senza, la produzione
   rifiuta di spedire — di proposito, così nessun contatto si perde in silenzio.

## Configurare consenso e analytics

Niente parte finché non lo configuri: senza variabili d'ambiente il sito non rende nessun banner,
non carica nessun tag e non scrive nessun cookie non essenziale. Per accenderlo:

1. Crea per il cliente il sito iubenda con la sua cookie policy, e il container GTM.
2. Imposta `PUBLIC_GTM_ID`, `PUBLIC_IUBENDA_SITE_ID` e `PUBLIC_IUBENDA_COOKIE_POLICY_ID` — su Vercel
   come variabili **Plain**, mai Sensitive (una variabile Sensitive arriva alla build come la
   stringa letterale `[SENSITIVE]`). Sono id pubblici che finiscono nel bundle, non segreti.
3. **La CSP non si tocca**: gli host di GTM e iubenda stanno già in `src/lib/csp/directives.ts`, da
   cui la policy si genera in fase di build, e `vercel.json` porta solo `frame-ancestors`. Un
   fornitore in più va in `directives.ts`, mai in `vercel.json`: `docs/guides/deploy-ops.md` §
   Tracciamento e Consent Mode v2.
4. Verifica su una preview, accettando e rifiutando, con GA4 Realtime e la console aperti: prima del
   consenso a Google non deve arrivare niente, e nessuna richiesta deve essere bloccata dalla CSP.

Lo stesso id di policy fa passare anche `/privacy` e `/cookie-policy` dalle loro bozze segnaposto ai
documenti iubenda ospitati. Vengono scaricati in fase di build, quindi una policy modificata su
iubenda arriva sul sito solo al deploy successivo, e la procedura è in `docs/guides/deploy-ops.md`
§ Ricostruire le pagine legali dopo una modifica alle policy.

## Aggiungere un webfont

Il design system legge `--font-stack-base` e `--font-stack-display` (con un fallback a system-ui),
quindi un webfont è solo configurazione:

1. In `astro.config.mjs` aggiungi la voce `fonts` (API font di Astro) con
   `cssVariable: '--font-stack-base'` (e/o `--font-stack-display`) e
   `fallbacks: ['system-ui', 'sans-serif']`.
2. Rendi `<Font cssVariable="--font-stack-base" preload />` nell'`<head>` del guscio
   (`src/layouts/document.astro`).

Nessuna modifica ai componenti né al CSS: `--font-sans` e `--font-display` in `globals.css` puntano
già a quegli agganci.

## Generatori da riga di comando

`pnpm gen` (menu interattivo) oppure direttamente:

- `pnpm gen:section` — sezione di una pagina a sezioni, di default la homepage: schema Zod, YAML
  piatto e componente, iniettati nell'unione, nello strato dati e nei marcatori `@gen` della pagina.
- `pnpm gen:page` — pagina statica, o dinamica `[slug]` con `getStaticPaths`; i percorsi annidati
  sono supportati (`legal/privacy`). Titolo e descrizione nascono come chiavi di dizionario,
  iniettate in ogni lingua di `src/i18n/strings/`.
- `pnpm gen:component` — componente `.astro` nativo secondo la ricetta cva più `cn()`.
- `pnpm gen:collection` — content collection di dati YAML o di documenti MD, con schema e contenuto
  di esempio, registrata in `content.config.ts`; oppure una pagina a sezioni completa di barrel,
  strato dati, pagina e prima sezione.

I generatori e i loro template arrivano da `@elia97/officina`: i comandi qui sopra chiamano
`officina gen`. Un generatore proprio del progetto va in `officina.generators.mjs`, nella radice, con
la firma di un plopfile (`export default function (plop)`), e compare nel menu accanto a quelli del
pacchetto.

Contratti che vale la pena conoscere (il dettaglio è in `docs/guides/content-collections.md`):

- i generatori **falliscono rumorosamente**: gli input si validano sui valori trasformati, ogni
  punto di aggancio dell'iniezione si verifica in un pre-volo **prima che venga scritto un solo
  file**, e il gate post-generazione (`astro sync` più `pnpm run check`) fa fallire il giro a ogni
  errore;
- se il gate post-generazione fallisce, i file generati restano su disco per essere ispezionati: il
  messaggio d'errore dice come tornare indietro (`gen:section` modifica anche tre file esistenti,
  `gen:page` e la pagina a sezioni di `gen:collection` i dizionari, da riportare con `git checkout`);
- non rinominare gli ancoraggi dell'iniezione (`export const collections`, `<nome>CollectionSchema`,
  `get<Nome>Sections`, i marcatori `@gen:<nome>-*` di ogni pagina a sezioni, la costante esportata
  di ogni dizionario): i generatori li verificano e si fermano con l'errore di contratto, e
  `pnpm run doctor`, dentro `pnpm run ci`, li verifica tutti, quindi una rinomina si ferma al gate
  invece che al lancio del generatore. Gli ancoraggi sono una delle sette sezioni che misura — le
  altre guardano i punti di aggancio dei generatori, script, dipendenze e strumenti, residui di ciò
  che è uscito, preset, workflow e Dependabot, e `officina.config.ts`, e stanno in
  `docs/ARCHITECTURE.md`.

## Aggiungere una lingua

Il template arriva con una lingua sola (`it`) e i binari i18n già posati: una seconda lingua è
puramente additiva.

1. `astro.config.mjs` — aggiungi il codice della lingua a `i18n.locales`.
2. `src/lib/site.ts` — aggiungi il suo tag BCP 47 a `localeTags`.
3. `test/stubs/astro-config-client.ts` — rispecchia il nuovo elenco di lingue. Fa le veci di
   `astro:config/client` negli unit test, quindi uno stub vecchio li lascia verdi mentre asseriscono
   contro la configurazione di prima.
   (I passi da 1 a 3 sono tenuti insieme da `src/i18n/locale-config.test.ts`.)
4. `src/i18n/strings/<lingua>.ts` — esporta un `Record<UIKey, string>`; il compilatore costringe a
   coprire ogni chiave.
5. `src/i18n/ui.ts` — registra il dizionario nuovo in `dictionaries`. Se il progetto ha dizionari di
   dominio, ognuno vuole il suo `src/i18n/<dominio>/<lingua>.ts`, registrato nel suo `index.ts`, e il
   type-check si ferma finché manca (`docs/guides/content-collections.md` § Dizionari di dominio).
6. `src/i18n/segments-by-locale.ts` — mappa i segmenti di URL di primo livello che cambiano
   (`contatti` → `contact`); quelli non mappati passano così come sono.
7. Contenuti: aggiungi i file `src/content/<collection>/<lingua>/…` (il contenuto nella lingua di
   default resta piatto, e i loader lo impongono).
8. Pagine: rispecchia l'albero di default sotto `src/pages/<lingua>/…`;
   `getHomepageSections(Astro.currentLocale)` e `useTranslations(Astro.currentLocale)` risolvono già
   per lingua.

I link della chrome passano da `localizedHref(Astro.currentLocale, path)` (vedi header e footer),
quindi nav e URL legali si localizzano senza toccare i componenti. Le CTA dei contenuti — i bottoni
dell'hero, di `cta-banner` e delle sezioni di `gen:section` — passano da `ctaHref()`, che localizza
i percorsi relativi e lascia come sono ancore, URL esterni, `mailto:` e `tel:`.

Il selettore di lingua compare da solo nell'header e nella nav mobile quando una pagina esiste in
almeno due lingue. Una pagina che non esiste in tutte dichiara le sue con la prop `locales` del
layout, `<MainLayout locales={['it']}>`: alternate hreflang e selettore leggono la stessa lista, come
spiega la politica degli URL in `docs/guides/seo.md`. Una pagina che esiste in una lingua ma non va
indicizzata, come una legale non ancora tradotta, si elenca invece in `NOINDEX_PATHS`
(`src/lib/seo/crawl-paths.ts`): che cosa ne segue lo dice `docs/guides/seo.md` § Sitemap e robots.

## Secret di release

L'automazione di release (`release-please.yml`) ha bisogno di questi secret impostati a mano su
GitHub — `gh secret set <NOME>` da dentro il repo, oppure Settings → Secrets and variables →
Actions:

- `RELEASE_PLEASE_TOKEN` — PAT fine-grained con `contents:write` e `pull_requests:write`. Serve
  perché la CI non gira sulle PR aperte con il `GITHUB_TOKEN` di default (una protezione di GitHub
  Actions contro la ricorsione): senza, la release PR di release-please non riceverebbe mai il check
  `ci`.
- `VERCEL_TOKEN` — token di accesso Vercel (vercel.com/account/tokens).
- `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` — da `.vercel/project.json`, dopo aver lanciato `vercel
  link` una volta in locale.

Finché i tre secret di Vercel non ci sono tutti, `deploy.yml` si salta in modo pulito, senza
fallire.

## Il lavoro di tutti i giorni

- I pezzi nuovi si cominciano dai generatori (`pnpm gen:*`), che emettono codice già sulle
  convenzioni del progetto (§ Generatori da riga di comando, sopra).
- Le issue di una milestone si seminano con `/metodo:milestone <nome-blueprint>|<N>`, e ognuna si
  implementa con `/metodo:pr <numero-issue>`: nessuno dei due committa, pusha o apre PR di sua
  iniziativa.

Le convenzioni `[HARD]` complete stanno in `metodo.md` del plugin; lo stack in `CLAUDE.md` e la
panoramica in `docs/ARCHITECTURE.md`.
