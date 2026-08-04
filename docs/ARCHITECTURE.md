# Architecture

## Stack

- **Framework**: [Astro](https://astro.build) 7, `output: "static"` (prerendered by default) with `@astrojs/vercel` as the deployment adapter — which is what provides the server, so the contact action and any `prerender = false` route are on-demand regardless of the output mode. Toolchain and the rules that govern it — pnpm/corepack, Node, Biome, `astro/tsconfigs/strictest`, the `prerender = false` opt-out — are in `CLAUDE.md` § Stack and conventions.
- **`@types/node` is a direct devDependency on purpose**, even though nothing imports it by hand. Vite's `UserConfig` type is peer-keyed on it: left to transitive resolution, pnpm installs one copy of Vite for astro and another for vitest, and the `test` key `vitest/config` augments onto `UserConfig` never reaches the type `getViteConfig()` accepts — `vitest.config.ts` then fails to typecheck with "'test' does not exist in type 'UserConfig'". Declaring it pins one peer for both. Don't drop it as unused.
- **Deploy**: Vercel. Production ships only from a release tag, never from a push to `main` — `scripts/vercel-ignore-build.sh` is wired into Vercel's Ignored Build Step, so the git integration only ever produces previews. See `docs/guides/deploy-ops.md` § Deploy model.
- **Images**: local assets go under `src/assets/**` — a folder the template doesn't ship, since it has no images of its own; create it with the first one, and add `sharp` then. `biome.json` already excludes `src/assets/**/*.svg` from formatting. See `docs/guides/rendering-performance.md` § Images.
- **Quality gates**: four, each covering a moment the others don't; nothing reaches production without passing all four. See `docs/guides/deploy-ops.md` § The gate chain.
- **Abuse protection**: three layers on the public action, cheapest-first — an in-app honeypot, an in-memory rate limit, and Vercel BotID Basic (observe-only until `BOTID_ENFORCE=true`). See `docs/guides/forms-email.md` § Abuse protection.
- **Crawl policy**: `src/lib/seo/crawl-policy.ts` is the single source of truth for what stays out of search — read by the sitemap filter, `robots.txt` and the middleware. See `docs/guides/seo.md` § Sitemap & robots.
- **Consent and analytics**: off unless configured — without **both** a GTM container id and an iubenda site id the layout renders no CMP, no tag and no cookie. Turning it on requires widening the CSP in `vercel.json`. See `docs/guides/deploy-ops.md` § Tracking & Consent Mode v2.
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

**[HARD]** This is enforced, not just described: `boundaries` in `.fallowrc.jsonc`
maps these zones and `pnpm exec fallow dead-code` fails on a crossing. The
direction that matters is the one prose kept losing — a component may not reach
back into a layout. Doing so inverts composition and makes the component
unusable inside any other layout, which is exactly how the legal pages had
drifted before the check existed.

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

## Planning and vertical agents

Milestones are seeded as GitHub issues (`/milestone`) and implemented one issue at a time (`/pr <issue-number>`) by the vertical agents in `.claude/agents/` — see `CLAUDE.md` § Planning and vertical agents.
