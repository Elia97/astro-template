---
name: "Foundations"
description: Turn the forked scaffold into this project — branding, environments, design system, SEO, forms, consent and real content.
---

# Foundations

Takes the freshly-forked scaffold from placeholders to a project that is
branded, deployable, indexable and able to receive a lead. Every project needs
it exactly once, as **Milestone 1** — nothing else can be built on a scaffold
that still calls itself `astro-template`.

Order is not arbitrary: sub-task 1 renames the project everything else refers
to, and sub-task 2 makes previews green so the remaining ones can be reviewed
on a real deployment rather than locally.

Unlike the other blueprints, this one is **transcribed into `docs/ROADMAP.md`
while the plan is being written**, because the estimate is derived from that
roadmap and this milestone is part of what gets quoted. By seeding time the
section already exists, so it is seeded bespoke — `/milestone 1`, not
`/milestone foundations`.

## Sub-tasks

### 1. chore(scaffold): personalize the template for {{project_name}}

**Agent:** general-purpose
**Labels:**

The repo was forked from `Elia97/astro-template` and still carries its
placeholders. This replaces them — it does not rewrite the scaffold. If the
production domain is not settled yet, leave an explicit `TODO`; never invent
one, because a wrong absolute URL silently poisons canonicals and OG tags.

Re-enable dependabot here: it is paused at repo creation
(`open-pull-requests-limit: 0`) precisely until this sub-task lands.

Checklist:
- [ ] `package.json#name` and `release-please-config.json` renamed — the name leaks into the changelog
- [ ] `src/lib/site.ts`: name, url, description, nav/CTA/legal entries
- [ ] `SITE.url` on the real domain, or an explicit `TODO`
- [ ] `astro.config.mjs` → `i18n.defaultLocale`/`locales` match the project's languages
- [ ] `public/favicon.svg`, `public/favicon.ico`, `public/og-default.png` replaced
- [ ] Dependabot re-enabled (the two `open-pull-requests-limit: 0` lines removed)
- [ ] `pnpm run ci` and `pnpm run build` green

### 2. ci(ops): environments, secrets and release-tag deploys

**Agent:** ops-agent
**Labels:**

Development, preview and production on Vercel, CI on every PR, production
shipping **only from a release tag**. Without `RELEASE_PLEASE_TOKEN` the
release PR never gets a `ci` check and can never be merged — it is the one
secret whose absence looks like nothing being wrong.

Checklist:
- [ ] Vercel project linked; `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` set
- [ ] `RELEASE_PLEASE_TOKEN` set (fine-grained PAT: `contents:write` + `pull_requests:write`)
- [ ] Ignored Build Step → `bash scripts/vercel-ignore-build.sh`
- [ ] `bash scripts/bootstrap-github.sh` re-run and green (ruleset, squash-only, Actions permissions)
- [ ] A push on a branch produces a green preview deployment

### 3. feat(ui): translate the approved design into tokens and primitives

**Agent:** ui-agent
**Labels:**

The design system rendered in code. **This is not design work**: it is the
transposition of an approved design into `src/styles/tokens.css` and the UI
primitives. `tokens.css` is the only file the rebrand touches — the semantic
names in `light.css`/`dark.css` stay as they are.

Checklist:
- [ ] Brand palette in `src/styles/tokens.css`; `SITE.themeColor` equal to `--background` in both themes
- [ ] Webfont wired via the Astro fonts API on `--font-stack-base`/`--font-stack-display`, if any
- [ ] UI primitives coherent with the design system, no hardcoded values outside the tokens
- [ ] Motion respects `prefers-reduced-motion`
- [ ] Dark and light both checked on the real chrome, not only on a component page

### 4. feat(seo): canonical, sitemap and structured data for {{domain}}

**Agent:** seo-agent
**Labels:**

Head, canonical, Open Graph, sitemap, `robots.txt` and the JSON-LD that
describes this specific business. Preview deploys must keep their
`X-Robots-Tag: noindex` — a preview that ranks competes with production.

Checklist:
- [ ] Absolute canonicals consistent with `SITE.url`
- [ ] Open Graph with the real `og-default.png` as fallback
- [ ] `sitemap.xml` and `robots.txt` correct for the project's locales
- [ ] JSON-LD (Organization/LocalBusiness) with the client's real data
- [ ] `hreflang` reciprocal with `x-default`, if the project is multilingual
- [ ] `*.vercel.app` still `noindex`

### 5. feat(forms): wire the contact form to the real inbox

**Agent:** forms-agent
**Labels:**

The form works in dev with no configuration — the vendor no-ops loudly. This
makes it send for real. Verify the sender domain's DKIM/SPF/DMARC **before**
go-live: without it production refuses to send by design, so a missing DNS
record surfaces as silence, not as an error.

Checklist:
- [ ] `CONTACT_*` values set; `BREVO_API_KEY` set locally and in the Vercel project (server-only)
- [ ] Sender domain verified in Brevo (DKIM/SPF/DMARC)
- [ ] Rate limiting exercised on the deployed preview, not only in unit tests
- [ ] A real submission arrives in the client's inbox, and the reply-to is usable

### 6. feat(ops): consent, analytics and the CSP that lets them through

**Agent:** ops-agent
**Labels:**

Nothing ships until configured: with no env set the site renders no banner,
loads no tag and sets no non-essential cookie. **Widening the CSP in
`vercel.json` is the step that gets forgotten** — `astro dev` never reads that
file, so everything looks right locally and production shows no banner at all.

Checklist:
- [ ] `PUBLIC_GTM_ID`, `PUBLIC_IUBENDA_SITE_ID`, `PUBLIC_IUBENDA_COOKIE_POLICY_ID` set as **Plain** vars, never Sensitive
- [ ] CSP in `vercel.json` widened, and the assertions in `src/vercel-headers.test.ts` updated with it
- [ ] Verified on a preview, accepting and rejecting, with GA4 Realtime open: nothing reaches Google before opt-in
- [ ] Consent Mode v2 defaults still denied

### 7. fix(content): real homepage copy, company data and legal pages

**Agent:** content-agent
**Labels:**

The last placeholders: homepage copy, the company data the legal pages render
from, and the switch of `/privacy` and `/cookie-policy` from their placeholder
drafts to the hosted documents. `termini` has no hosted counterpart and stays
behind its "needs legal review" alert until someone reviews it.

Checklist:
- [ ] `src/content/homepage/*.yml` with real copy, not lorem
- [ ] Company data (legal name, VAT, registered address, contacts) from `docs/PROJECT.md`
- [ ] iubenda policy id set — `/privacy` and `/cookie-policy` resolve to the hosted documents
- [ ] `/termini` reviewed, or its draft alert deliberately left in place
- [ ] 404 and 500 pages read like this project, not like a template
