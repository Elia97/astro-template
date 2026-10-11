# SEO

Convenzioni stabilite dalla head centralizzata (`src/components/head/head.astro`).

## Il contratto della head

- `head.astro` è l'unico posto per titolo, descrizione, canonical, OG, Twitter, JSON-LD e hreflang.
  Le pagine passano le prop SEO al **layout** (`src/layouts/main.astro`), che le inoltra: una pagina
  non rende mai `head.astro` direttamente.
- Dentro è un orchestratore sottile: la risoluzione di URL e meta è una funzione pura (`head/seo.ts`
  → `resolveHeadSeoMeta`, coperta da `head/seo.test.ts`), e il rendering è diviso per competenza
  (`head/{alternates,og,twitter,json-ld}.astro`). Si estende aggiungendo meta al sottocomponente
  giusto, non facendo crescere l'orchestratore.
- **Il `<title>` si compone in `resolveHeadSeoMeta`, mai nelle pagine.** La pagina passa al layout
  il suo titolo nudo, che spesso usa anche come `<h1>` o nel `BreadcrumbList`, e la head lo emette
  come «Contatti | Nome del sito»: il separatore è `|` anche quando il titolo contiene già un `—`,
  come quelli di 404 e 500. Il titolo resta nudo quando è già `SITE.name`, come sulla home, e
  quando la pagina passa `absoluteTitle` al layout.
- **`og:title` e `twitter:title` restano nudi**: il nome del sito lo porta già `og:site_name`.
- `<meta charset>` e `<meta viewport>` stanno nel **layout**, prima dello script inline del tema: la
  dichiarazione di codifica deve stare entro i primi 1024 byte del documento. Non spostarli dentro
  `head.astro`.

## Politica degli URL (canonical e hreflang)

- `trailingSlash: 'never'` in `astro.config.mjs` è la politica di tutto il sito. L'adapter Vercel la
  trasforma in un 308 a livello di piattaforma (`/(.*)/$ → /$1`): non aggiungere redirect a mano.
- Canonical **e** alternate hreflang si costruiscono entrambi con `getAbsoluteLocaleUrl` su un
  percorso indipendente dalla lingua (`localeAgnosticPath` in `src/i18n/path.ts`: prefisso della
  lingua corrente tolto, segmenti localizzati riportati alla forma canonica, slash finale
  normalizzato), e poi si rilocalizzano per lingua (`translatePath`). Non costruire mai un canonical
  a mano da `Astro.url.pathname` grezzo: i percorsi grezzi e gli URL di `astro:i18n` non concordano
  su slash e prefissi di lingua, e Google ignora un hreflang che non punta al canonical.
- `SITE.localeTags` mappa i **codici** di lingua (per le voci oggetto è `codes[0]`, non `path`) sui
  tag BCP 47 usati per `lang`, `hreflang` e `og:locale` (in forma con underscore). `x-default` punta
  alla lingua di default.
- **[HARD] Non emettere mai un `hreflang` che punta a un 404.** Google scarta l'**intero** gruppo
  quando un alternate è morto — ogni lingua di quella pagina, non solo quella rotta — e nessun gate
  qui se ne accorge: viene fuori in Search Console settimane dopo. Una pagina senza traduzione non
  emette nessun link per quella lingua.
- Sotto `exactOptionalPropertyTypes` questo significa **omettere la chiave**, non metterla a
  `undefined`: `...(twin ? { en: twin } : {})`.
- **Una pagina dichiara le sue lingue** con la prop `locales` del layout,
  `<MainLayout locales={['it']}>`; senza la prop valgono tutte quelle di `astro.config.mjs`. La lista
  la risolve `pageLocales()` in `src/i18n/locales.ts`, e la leggono sia gli alternate di
  `resolveHeadSeoMeta()` sia il selettore di lingua: una lingua che la configurazione non instrada
  ferma il build, e `x-default` esce solo se la pagina esiste nella lingua di default.
- **Un percorso di `NOINDEX_PATHS` resta fuori dal gruppo delle lingue.** Le traduzioni non lo
  annunciano, `x-default` non ci punta, e la pagina stessa non emette hreflang: Google ignora un
  hreflang a cui l'altra pagina non risponde, e chiede che ogni versione elenchi anche sé stessa.
  Lo decide `resolveHeadSeoMeta()` leggendo `src/lib/seo/crawl-policy.ts` (§ Sitemap e robots).
  Restano gli `og:locale:alternate`, perché `noindex` dice che cosa indicizzare e non che cosa
  condividere, e il selettore di lingua, che è navigazione: un `hreflang` su un `<a>` Google non lo
  legge come annotazione.
- Gli alternate `xhtml:link` di una sitemap si accoppiano **per percorso identico dopo il prefisso
  di lingua**, quindi con slug localizzati non si accoppiano mai. Con il routing localizzato
  l'hreflang che conta è quello nella `<head>`: la sitemap non rimedia.

## JSON-LD

I dati strutturati si passano come oggetti tramite la prop `jsonLd` del layout. `head/json-ld.astro`
codifica `<` (nella forma unicode) prima di `set:html`, così il contenuto non può chiudere in
anticipo l'elemento script. Non usare mai `set:html` sull'output grezzo di `JSON.stringify` da
nessun'altra parte.

I costruttori stanno tutti in `src/lib/seo/json-ld.ts`, rendono assoluti i loro URL rispetto a
`SITE.url`, e un progetto ci aggiunge quelli delle proprie entità. Il template ne monta tre:
`buildOrganization()` e `buildWebSite()` in `src/pages/index.astro`, che vivono solo sulla homepage,
e `buildBreadcrumbList()` in `src/pages/contatti.astro`. Gli altri (`buildItemList()`,
`buildArticle()`, `buildFaqPage()`, `buildLocalBusiness()`) aspettano le pagine che li chiedono.

`Organization` e `LocalBusiness` portano gli stessi campi aziendali, da `COMPANY` e `SITE`: ragione
sociale, telefono, email e indirizzo, la partita IVA come `vatID`, i profili di `SITE.social` come
`sameAs` e, solo se `COMPANY.logo` è impostato, il `logo`. Come nodo principale della homepage se ne
sceglie uno:

- **`Organization`** per un'azienda che non riceve il pubblico in una sede, come un'agenzia o un
  servizio online;
- **`LocalBusiness`** per un'attività con una sede che il pubblico raggiunge, come un negozio, uno
  studio o un ristorante: porta anche `openingHours` e `geo`, che `Organization` non ha. In
  `src/pages/index.astro` si sostituisce `buildOrganization()` con `buildLocalBusiness()`, a cui si
  passano orari e coordinate.

Un segnaposto rimasto in `COMPANY` o in `SITE.social` non arriva in produzione: lo ferma
`check:placeholders` nel job di deploy (`deploy-ops.md` § La catena dei gate).

Per una coppia di rotte listing e dettaglio, il **listing** emette `BreadcrumbList` più un
`ItemList` dei suoi figli (il catalogo); ogni **dettaglio** emette lo schema della singola entità
(`Service`, `Article`, …) e il proprio `BreadcrumbList`. Non replicare l'entità intera sul listing:
l'istanza autorevole appartiene al suo URL di dettaglio. Il percorso visibile lo rende `Breadcrumb`
(`src/components/ui/breadcrumb/`) con lo stesso elenco di voci passato a `buildBreadcrumbList()`,
così il JSON-LD e la pagina non raccontano due percorsi diversi.

### Una società, un'entità (quando un progetto ne aggiunge una seconda)

Nel momento in cui la società compare in più di un posto — un `LocalBusiness` sulla pagina contatti,
o un riferimento compatto usato come `author`, `publisher` o `provider` — i nodi hanno bisogno di
`@id` stabili (`${SITE.url}/#organization`), e il secondario si aggancia al primo con
`parentOrganization`.

- **L'`@id` è un identificatore, non un URL navigabile.** Quel frammento non risolve a niente, ed è
  voluto.
- **[HARD] Lo stesso `@id` fonde i nodi**, quindi `name` e `legalName` devono essere **identici** nel
  riferimento compatto e nel nodo completo: se differiscono, la fusione produce un'entità sola con
  due nomi.
- **Un `logo` deve stare su fondo chiaro.** Google lo dipinge sul proprio pannello bianco, dove un
  logotipo bianco su trasparente sparisce. `src/lib/seo/json-ld.test.ts` verifica che il file di
  `COMPANY.logo` esista in `public/`: un logo che risponde 404 fallisce in silenzio, come le icone
  del manifest qui sotto.
- **Un `name` che viene da un campo di contenuto passa da un normalizzatore a riga singola.** Gli
  scalari a blocco di YAML tengono i loro a capo, e uno che arriva a un `<title>` o al `name` di uno
  schema ci finisce stampato tale e quale.

## OG e social

- Gli URL delle immagini OG e Twitter sono sempre assoluti, costruiti da `SITE.url`.
- `public/og-default.png` è un segnaposto 1200×630 a tinta unita: **si sostituisce in ogni
  progetto**, tenendo `SITE.defaultOgImage` puntato su un file che esiste (un `og:image` morto fa
  fallire i validatori delle social card). Con lui cambiano `SITE.defaultOgImageSize`, che
  `src/lib/site.test.ts` confronta con l'intestazione del PNG, e il suo alt, la chiave
  `seo.defaultOgImageAlt` del dizionario.
- **Misure e alt valgono solo per l'immagine di default.** `og:image:width`, `og:image:height`,
  `og:image:alt` e `twitter:image:alt` escono quando la pagina non passa un `ogImage` suo: di
  un'immagine di pagina il template non conosce le misure. Facebook usa le misure per mostrare
  l'immagine già alla prima condivisione, prima di averla scaricata ed elaborata.
- **Un'immagine OG generata è in cache per sempre.** `@vercel/og` risponde con
  `cache-control: public, immutable, max-age=31536000`, quindi modificare il template non aggiorna
  né le immagini già servite né le copie che i social tengono. Per rinfrescarle serve un *URL
  nuovo*, non un deploy nuovo.

## Icone, manifest e theme-color

`head/icons.astro` porta l'identità del documento — favicon, link al manifest e colore della chrome
del browser — e viene reso una volta sola da `head.astro`.

- **Il manifest si costruisce, non si scrive.** `src/lib/seo/manifest.ts` lo deriva da `SITE` (nome,
  descrizione, lingua, colori) e `src/pages/site.webmanifest.ts` lo serve prerenderizzato, così
  l'identità installata non può divergere da quella del sito.
- **`id`, `start_url` e `scope` sono fissati su `/`.** Cambiare `id` fa sì che i browser trattino il
  sito come un'altra applicazione: un'installazione esistente smette di aggiornarsi e il prompt
  ricompare.
- **`manifest.test.ts` verifica che ogni icona dichiarata esista davvero.** Un'icona elencata ma non
  consegnata è un 404 che il browser segnala solo al momento dell'installazione, dove non guarda
  nessuno — ed è il motivo per cui l'elenco è corto invece che velleitario.
- **Le icone raster le genera `pnpm gen:icons` dal favicon.** Da `public/favicon.svg` scrive
  `public/icon-192.png`, `public/icon-512.png` e `public/icon-maskable-512.png`, opache sul colore
  `SITE.themeColor.light` del manifest: il prompt di installazione di Chrome vuole un raster di almeno
  192px. La maskable tiene il glifo nel quadrato inscritto nella zona sicura, il cerchio centrale di
  diametro pari all'80% del lato che la maschera adattiva di Android non taglia. Le icone si
  committano e si rigenerano dopo aver sostituito il favicon; `src/lib/seo/manifest.test.ts` lega le
  loro specifiche alle voci di `ICONS`, leggendo `ICON_SPECS` da `@elia97/officina/icons`.
- **`SITE.themeColor` deve essere uguale a `--background`** in `light.css` e `dark.css`, altrimenti
  la chrome del browser e la pagina non concordano sulla giuntura — lo verifica
  `src/styles/theme-color.test.ts`, che risolve i token e converte oklch in esadecimale. È in
  esadecimale e non in oklch:
  `<meta name="theme-color">` lo interpreta lo strato di interfaccia del browser, dove il supporto è
  più stretto che nel CSS.

## Sitemap e robots

- `@astrojs/sitemap` (in `astro.config.mjs`) emette `sitemap-index.xml` in fase di build: in
  sviluppo non viene mai servito. La sua mappa delle lingue rispecchia `SITE.localeTags`.
- **`lastmod` viene dalla storia git.** La `serialize` del sitemap,
  `withLastmod(createLastmodResolver())`, data ogni URL con l'ultimo commit fra i file che lo
  producono, e `lastmodSources()` in `src/lib/seo/sitemap-lastmod.ts` dice quali sono: `/` è
  `src/pages/index.astro` più `src/content/homepage`, `/contatti` e `/termini` sono il loro `.astro`.
  Un progetto ci aggiunge le sue rotte con i file che le producono: una pagina di dettaglio porta il
  suo `[slug].astro` e il file della voce, e le rotte di un'altra lingua portano i loro file.
- **Non tutte le pagine hanno `lastmod`, e non sempre.** `/privacy` e `/cookie-policy` ne restano
  senza: il testo arriva da iubenda durante il build, e git non ne conosce la data. In un clone
  shallow `git log` attribuisce ogni file al commit di confine, quindi lì `lastmod` si omette, con un
  avviso nel log del build. La data giusta vuole `fetch-depth: 0`, che il deploy ha perché glielo
  dà l'action di officina, mentre `ci.yml`, `lighthouse.yml` e i preview dell'integrazione git di
  Vercel costruiscono senza la storia completa.
- **Una sitemap di media vuole un endpoint suo.** L'hook `serialize` dell'integrazione non può
  emettere un namespace `<video:…>` o `<image:…>`: il suo tipo `SitemapItem` è un `Pick` di
  `url|lastmod|changefreq|priority|links` e nient'altro. Quella sitemap si emette da una rotta
  propria e si aggancia con `customSitemaps`.
- **I campi degli schemi dei media portano i limiti della piattaforma, imposti in build.** Google
  taglia il `name` di un video a 100 caratteri e la `description` a 2048: quei limiti vanno nello
  schema Zod invece che in un troncamento al momento della serializzazione — far fallire la build è
  meglio che spedire nell'XML una stringa tagliata in silenzio. Stessa regola per il JSON-LD e la
  sitemap che descrivono lo **stesso** insieme: si risolvono entrambi da una funzione sola, o
  finiscono per descrivere media diversi.
- Nella sitemap finiscono solo le rotte **prerenderizzate**: le pagine indicizzabili restano
  prerenderizzate (che è il default), oppure gli URL on-demand si elencano con `customPages`.
- `src/pages/robots.txt.ts` (prerenderizzato) indirizza i crawler alla sitemap e legge la sua lista
  di disallow da `crawl-policy.ts`: il controllo dell'indicizzazione per singola risposta NON sta lì
  (i crawler mettono in cache robots.txt).
- **`src/lib/seo/crawl-policy.ts` è la fonte unica di verità** e alimenta `robots.txt`, il `filter`
  della sitemap, la head e il middleware. Due liste: `ROBOTS_DISALLOWED_PATHS` (bloccate al
  crawler, mai scaricate) e `NOINDEX_PATHS` (scansionabili, tenute fuori dall'indice). Escono
  entrambe dalla sitemap, arrivano vuote, e la corrispondenza è per sottoalbero e deve restare tale
  — `/area-riservata` copre `/area-riservata/documenti`. Una corrispondenza esatta lascerebbe
  indicizzabile ogni figlio senza che niente fallisca, ed è il motivo per cui `matchesSubtree` porta
  una nota `[HARD]`.
- **Per togliere una pagina dall'indice basta la sua voce in `NOINDEX_PATHS`**: la pagina non passa
  niente al layout. La head le dà `<meta name="robots" content="noindex, nofollow">`, l'unico
  segnale che arriva a una pagina prerenderizzata, e nessuna pagina la annuncia con un hreflang
  (§ Politica degli URL). Conta l'URL richiesto, `Astro.originPathname`: una pagina resa con una
  rewrite, o con il fallback di i18n, risponde del suo URL e non di quello di destinazione. Il
  `filter` della sitemap gira prima che `@astrojs/sitemap` calcoli gli alternate `xhtml:link`, quindi
  la pagina non compare nemmeno fra gli alternate delle altre voci.
- Anche `src/middleware.ts` legge `NOINDEX_PATHS` e mette `X-Robots-Tag` su ogni risposta resa a
  richiesta: su una pagina HTML si somma al meta, su una risposta non HTML (un feed generato, un
  endpoint JSON), dove nessun meta può esistere, è l'unico segnale. Su una pagina prerenderizzata
  non arriva, perché Astro scarta in build le sue intestazioni di risposta.
- L'esclusione serve solo per le rotte che **vengono** costruite ma devono restare fuori
  dall'indice. Una rotta che in produzione `getStaticPaths` non enumera mai (per esempio una bozza
  tenuta fuori da un predicato di visibilità) non ha bisogno né dell'una né dell'altra: nella
  sitemap arrivano solo le rotte prerenderizzate, quindi un URL mai costruito non può comparirci, e
  nessun `filter` serve.

## Deploy di preview

Una regola di header `has: host` in `vercel.json` mette `X-Robots-Tag: noindex, nofollow` su ogni
host `*.vercel.app`: i deploy di preview e di branch non devono mai fare concorrenza al dominio di
produzione negli indici. Non c'è niente da configurare per progetto.

Vive sul bordo e **non** in `src/middleware.ts`: per una pagina prerenderizzata il middleware gira
una volta sola in fase di build e le sue intestazioni di risposta finiscono scartate dentro un file
statico, quindi un controllo nel middleware avrebbe coperto solo le rotte on-demand.
`src/vercel-robots.test.ts` fissa la regola e verifica che non corrisponda mai al dominio
personalizzato — il guasto che farebbe sparire il sito vivo da ogni indice.
