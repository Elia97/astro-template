# Architecture

## Stack

- **Framework**: [Astro](https://astro.build) 7, `output: "server"` (SSR by default) with `@astrojs/vercel` as the deployment adapter. Pages that don't depend on per-request data opt into static rendering with `export const prerender = true`.
- **Language**: TypeScript, `astro/tsconfigs/strictest`.
- **Formatting/linting**: [Biome](https://biomejs.dev) — sole tool, no ESLint/Prettier. Config in `biome.json`.
- **Package manager**: pnpm via corepack, pinned in `package.json#packageManager`. Node pinned in `.nvmrc`.
- **Deploy**: Vercel. Production ships only from a release tag (see `scripts/vercel-ignore-build.sh`), not from every push to `main` — the Vercel git integration is deliberately disabled for `main` and `release-please--*` branches. The `main` ruleset (`scripts/bootstrap-github.sh`) guards that path by making `ci` a required check on every PR, so nothing reaches a tag without having passed it.
- **Images**: local assets go under `src/assets/**` — a folder the template doesn't ship, since it has no images of its own; create it with the first one. They're optimized at build time by `astro:assets` (Sharp) into static responsive variants — deliberately not the Vercel adapter's `imageService`, to stay portable off-Vercel and off the Image-Optimization quota. Add `sharp` as a devDependency at that point; `biome.json` already excludes `src/assets/**/*.svg` from formatting.
- **Quality gates**: four, each covering a moment the others don't — the `main` ruleset (`ci` required on every PR), `pnpm run ci` re-run on the release tag, `pnpm perf:bundle` over `dist/client` after the build, and `pnpm smoke:prod` against the live host after the deploy. Nothing reaches production without passing all four. See `docs/guides/deploy-ops.md` § The gate chain.
- **Abuse protection**: three layers on the public action, cheapest-first — an in-app honeypot (`src/lib/forms/honeypot.ts`, drops silently), an in-memory rate limit, and Vercel BotID Basic (`botid` dependency, free on every plan) whose verdict is observe-only until `BOTID_ENFORCE=true`. Both BotID halves are gated on `import.meta.env.PROD`; the challenge is proxied same-origin by `vercel.json` rewrites, which is why it needs no CSP entry. See `docs/guides/forms-email.md` § Abuse protection.
- **Crawl policy**: `src/lib/seo/crawl-policy.ts` is the single source of truth for what stays out of search — read by the sitemap filter, `robots.txt` and the middleware. Matching is by subtree, so a listed section covers everything under it. It is import-free by constraint: `astro.config.mjs` loads before Vite resolves the `@/` alias.
- **Consent and analytics**: off unless configured. `src/lib/analytics/tracking.ts` returns null without BOTH a GTM container id and an iubenda site id, and with null the layout renders no CMP, no tags and no cookie — the template's default state. When they are set, `src/lib/consent/gate.ts` holds every measurement/marketing script in a queue until the user opts in, and translates the CMP preference into Google Consent Mode v2. Turning it on requires widening the CSP in `vercel.json`: the exact source lists are in `src/components/head/tracking.astro`.
- **Function region**: `fra1` (`vercel.json`). Left unset, Vercel defaults to `iad1` and every SSR route and action round-trips across the Atlantic.

## Repository layout

Every path carries one of four roles. The labels exist for what they let you
**skip**: machinery is roughly two thirds of the tree and a fork never edits it.

- `machinery` — the template working. Open it when something breaks, not before.
- `config` — the shape stays, the values are yours.
- `chrome` — page furniture you keep and restyle.
- `seed` — where your code starts. Not a demo to delete: the generators write
  into these exact paths, so `pnpm gen:section` extends them.
- `example` — a worked reference to rewrite or delete outright.

`seed` and `example` are the distinction worth getting right, because they pull
in opposite directions. `src/content/homepage/hero.yml` is example — real copy
replaces it. `src/lib/schemas/homepage/` is seed — `gen:section` adds a file to
that folder and injects into the barrel next to it. Deleting a seed path doesn't
declutter the fork, it breaks a generator.

```text
src/
  pages/       # file-based routing                                     example
               #   robots.txt, site.webmanifest, 404, 500               machinery
  layouts/     # main.astro: document shell (lang, head, chrome)        chrome
  components/
    head/      # metadata, icons, manifest link, pre-paint scripts      machinery
    ui/        # design system (cva + cn), zero client JS               machinery
    forms/     # submit binder, field errors, honeypot, BotID           machinery
    layout/    # header, footer, mobile nav, skip-link                  chrome
    contact/   # worked reference: an action-backed form                example
    legal/     # worked reference: a legal page                         example
    home/      # a homepage section                                     example
  lib/         # logic without markup — leaf layers (rule below)
    seo/       #   json-ld, crawl-policy, manifest                      machinery
    forms/     #   honeypot, honeypot-schema, rate-limit, form-fields   machinery
    overlay/   #   trap-focus, scroll-lock                              machinery
    motion/    #   client-side motion lifecycle                         machinery
    a11y/      #   route-focus (post-swap focus reset)                  machinery
    consent/   #   consent gate + iubenda CMP                           machinery
    analytics/ #   GTM behind the gate, dataLayer bridge                machinery
    legal/     #   hosted legal documents (iubenda)                     machinery
    content/   #   locale-aware collection reader                       machinery
    vendor/    #   third-party clients (brevo)                          machinery
    schemas/   #   content collection schemas                           seed
    site.ts    #   site identity, SSoT                                  config
    company.ts #   legal entity, SSoT                                   config
    utils.ts   #   cn()                                                 machinery
    contact.ts, homepage.ts # the worked example's domain modules       seed
  types/       # ambient Window declarations for the browser globals    machinery
  i18n/        # href/path/route-segments/translate/ui                  machinery
               #   strings/<locale>.ts                                  config
  actions/     # the contact action; handlers exported by name so the
               #   orchestration is testable                            seed
  content/     # collection data                                        example
  styles/      # tokens.css — the rebrand surface                       config
               #   light/dark/globals                                   machinery
  middleware.ts # X-Robots-Tag for non-HTML SSR responses               machinery
test/          # test-only infra, never bundled                         machinery
  stubs/       # the astro:* virtual modules, resolved through vitest aliases
  helpers/     # shared fixtures and mocks (action handlers)
  container.ts # Container API render helpers for .astro components
public/        # static assets, served as-is (favicons, og-default.png placeholder)
docs/          # planning + architecture docs for whichever project is built from this template
  guides/      # domain-specific pattern references, consulted by the vertical agents (see below)
  milestone-templates/ # reusable milestone blueprints (see docs/milestone-templates/README.md)
scripts/       # operational tooling — never imported by src/
  lib/         # pure logic split out of a script so vitest can cover it
  gen/         # plop generators (page/component/collection/section) + ts-morph injection
  templates/   # .hbs templates the generators render
plopfile.mjs   # CLI harness: `pnpm gen` / `pnpm gen:<name>`
.claude/
  agents/      # vertical subagent definitions
  commands/    # /milestone (seed issues) + /pr (implement one) commands
```

`src/lib/` groups machinery by the same domains as the guides and the vertical
agents — `seo/` ↔ `seo.md`, `forms/` ↔ `forms-email.md`, `motion/` ↔
`rendering-performance.md`, `overlay/` and `a11y/` ↔ `ui-components.md`,
`content/` ↔ `content-collections.md`, `consent/` + `analytics/` + `legal/` ↔
`deploy-ops.md`. So the path answers which agent owns a file. The rule for a new
one: **domain machinery goes in its domain folder; cross-cutting config and the
seed stay flat.**

What stays flat, and why it isn't an oversight:

- `site.ts` and `company.ts` are the two config SSoTs, imported from everywhere —
  a folder would add a hop to the most-read files in the repo.
- `utils.ts` is `cn()`, imported by nearly every component.
- `contact.ts`, `homepage.ts` and `schemas/` stay flat because they are `seed`,
  not because moving them would be expensive: the plop generators reach them by
  hardcoded path, and those paths are where a fork's own sections land. Filing
  them under something like `example/` would have `pnpm gen:section` writing
  real project code into a folder named after a demo.

**[HARD]** The roles are a reading aid, not an import boundary: `example` code
imports `machinery` freely, and the layering rules in the next section are what
actually constrain the direction. Don't turn a label into a lint rule — the
labels describe intent for a human, and intent is exactly what a fork changes.

## Source layering

`src/` is the boundary for everything the app build bundles — runtime code never
lives outside it, tooling never lives inside it. Within `src/`, dependencies
flow one way:

- `lib/` — leaf layers: no imports from the rendering tree (no `.astro`, no
  layouts/pages). `site.ts` is the single source of truth for site metadata and
  chrome content; `motion/` owns the client-side motion lifecycle.
- `components/` consume `lib/`. `components/layout/` is the page chrome, driven
  entirely by `SITE` (nav/CTA/legal/microcopy — no hardcoded content).
- `layouts/` compose components into the document shell; `pages/` talk to
  layouts, never to `head.astro` directly.

## UI primitives — no React/Radix in the base scaffold

`src/components/ui/` holds native `.astro` primitives (button, badge, alert,
card, input, textarea) using `cva` variants + `cn()` — shadcn's API shape with
zero client runtime. This is deliberate: across real projects the friction with
shadcn-on-Astro came specifically from *stateful, portal-based* Radix
components inside islands, not from the presentational layer.

If a fork genuinely needs a stateful component (Dialog, Calendar, Accordion),
bringing in React + Radix **for that specific island** is fine — with these
known failure modes in mind (hit in production, don't rediscover them):

- Use `client:idle`, not `client:visible`, for portal content that is zero-size
  while closed — a closed Dialog never intersects, so `client:visible` never
  hydrates it.
- Astro's CSP needs `unsafe-inline` in `style-src` (or the `styleDirective`
  escape hatch) for Radix's runtime-injected styles.
- Islands don't share state: bridge static markup ↔ island through `data-*`
  attributes explicitly.

## Commit and release workflow

- Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook.
- Squash-merge only into `main` (one PR = one commit on `main`), with an empty commit body (`squash_merge_commit_message=BLANK`, set by `scripts/bootstrap-github.sh`) — release-please parses body lines too, so anything left there re-lists the same change in the CHANGELOG. A breaking change must therefore be marked with `!` in the PR title, not with a `BREAKING CHANGE:` footer.
- Release automation via release-please (see `HOW_TO_USE.md` for the secrets checklist required to activate it).

## Planning and vertical agents

Work for a project built from this template is seeded as GitHub issues via `/milestone <template-name>|<N>` (from a `docs/milestone-templates/*.md` blueprint or a hand-written `docs/ROADMAP.md` section) and implemented one issue at a time via `/pr <issue-number>`, coordinating domain-specific vertical agents (`.claude/agents/`) — each following the matching guide in `docs/guides/*.md` when one exists. See `CLAUDE.md` for the full breakdown.
