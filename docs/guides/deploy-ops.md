# Deploy & ops

Conventions for the Vercel deployment, the release pipeline and everything that
lives in `vercel.json`. Cross-ref: `rendering-performance.md` (bundle budget),
`seo.md` (preview deploys, URL policy), `forms-email.md` (the env-var policy for
vendor keys).

**[HARD]** `astro dev` does not read `vercel.json`. Headers, CSP, redirects and
rewrites are inert locally and can *only* be verified on a real deploy. "It works
in dev" is not evidence for anything in this file.

## Deploy model

Production ships **only from a release tag**, never from a push to `main`:

- `scripts/vercel-ignore-build.sh` is wired into Vercel's *Ignored Build Step*
  (Settings → Build & Deployment → "Run my Bash script"). It exits 0 (skip) on
  `main` and `release-please--*`, exits 1 (proceed) everywhere else — so the git
  integration only ever produces **preview** deploys.
- The production deploy is the `deploy` job in
  `.github/workflows/release-please.yml`: it checks out the released **tag** (not
  whatever `main` points at by then), then `pnpm run ci` → `vercel pull --prod` →
  `vercel build --prod` → `vercel deploy --prebuilt --prod` → `pnpm smoke:prod`.
- The job is gated on `check-vercel-secrets`: with `VERCEL_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` unset it emits a notice and skips — a
  fresh fork never fails CI just because it isn't connected to Vercel yet.
- The Vercel CLI is **version-pinned** (`pnpm dlx vercel@58`) in the `deploy`
  job — Dependabot doesn't watch `pnpm dlx`, so bump it deliberately.

`regions` in `vercel.json` is `fra1`, and is worth a deliberate decision per
fork: a build emits a single `_render` function reached by `/_actions`,
`/_image` and `/_server-islands`, so pin the region near the audience (left
unset, Vercel defaults to `iad1`, US East). Prerendered pages are unaffected —
static files off the CDN, whatever the function region.

## The gate chain

Four gates, each covering a moment the others don't:

| Gate | Where | Covers |
|---|---|---|
| `ci` required check | `main` ruleset, from `scripts/bootstrap-github.sh` | everything that lands on `main` |
| `pnpm run ci` | `deploy` job, on the tag | what ships from the tag |
| `pnpm perf:bundle` | `ci.yml`, after the build | client JS per route |
| `pnpm smoke:prod` | `deploy` job, after the deploy | what the edge actually serves |

- **`pnpm run ci` on the tag is not redundant.** `vercel build` is `astro build`:
  it type-checks nothing and runs no test.
- **The ruleset sets `strict_required_status_checks_policy: true`** — a branch has
  to be up to date with `main` before it can merge. Without it, two PRs each green
  against an older `main` both land and leave `main` red on their combination. The
  cost is a rebase per open PR whenever `main` moves, which is why
  `.github/dependabot.yml` groups each ecosystem into a single PR.
- `perf:bundle` stays out of the `deploy` job: it reads `dist/client`, which
  `vercel build` never emits.

**[HARD]** Nobody bypasses the ruleset on a client project — `bypass_actors` is
empty, admins included; the emergency exit is disabling it in Settings → Rules,
which the audit log records. (`ADMIN_BYPASS=1` on `scripts/bootstrap-github.sh`
opts the admin role back in — for a repo maintained by direct pushes to `main`,
this template's own being the case it exists for, never for a client's.)
release-please needs no bypass: it opens a PR like everyone else, and cuts the
tag only after the merge.

## `vercel.json` is the only place for headers, redirects and rewrites

Never hardcode any of it in application code, and never duplicate what the
adapter already generates (a trailing-slash redirect from `trailingSlash` is one
such case).

Because none of it runs locally, each rule is pinned by a declarative test —
that's the only pre-deploy signal there is:

| Test | Guards |
|---|---|
| `src/vercel-headers.test.ts` | the six unconditional security headers + every CSP directive |
| `src/vercel-robots.test.ts` | the `*.vercel.app` noindex rule, and that it never matches the custom domain |
| `src/vercel-botid.test.ts` | the BotID proxy rewrites and the `X-Frame-Options` override's position |

Rule order matters and the tests encode it: **the last matching header rule
wins**, so the `SAMEORIGIN` override for the BotID path has to sit *after* the
global `DENY`.

Preview deploys are noindexed by a `has: host` header rule, not by
`src/middleware.ts` — see `seo.md` § Preview deploys.

## Content-Security-Policy

The template ships a **self-only** policy. `src/vercel-headers.test.ts` pins the
exact source list per directive, not a superset — so adding a vendor is a
deliberate two-file change (the policy and the test), never a side effect of
pasting a snippet.

The rule that decides whether a vendor touches the CSP at all:

- **Server-only vendor → no CSP change.** Brevo is called from an Astro Action on
  the server; nothing about it reaches the browser, so `connect-src` stays out of
  it. Adding an origin "to be safe" widens the policy for nothing.
- **Client-side vendor → one directive per behavior**, added explicitly. Never a
  wildcard when the vendor documents concrete hosts.
- **Consent doesn't enter the decision.** An origin contacted regardless of what
  the visitor chooses (an image CDN, say) belongs in the policy either way. The
  gate decides *when* a script runs, never whether its origin is allowed.

- Adding a vendor: widen the *specific* directive it needs (`script-src`,
  `connect-src`, `img-src`, `frame-src`), never `default-src`, and update the
  test in the same commit.
- One missing entry fails **silently** in a way local dev cannot show: `astro
  dev` never reads `vercel.json`. Deploy a preview and watch the console on both
  the accept and the reject path before calling it done.
- `'unsafe-inline'` on `script-src` is load-bearing today: the theme script must
  run before first paint to avoid a flash, so it can't be an external module. The
  upgrade path is per-page SHA-256 hashes computed at build time by an
  `astro:build:done` integration, which lets `'unsafe-inline'` be dropped.
- `'unsafe-eval'` is refused and nothing here needs it.
- BotID needs **no** CSP entry: its challenge is proxied same-origin through the
  `vercel.json` rewrites, which is also what keeps ad-blockers out of the way.

## Tracking & Consent Mode v2

Off unless configured. `getTrackingConfig()` (`src/lib/analytics/tracking.ts`)
returns `null` unless **both** `PUBLIC_GTM_ID` and `PUBLIC_IUBENDA_SITE_ID` are
set — with `null` the layout renders no CMP, no tags and no cookie, which is how
the template ships and how dev always runs.

**[HARD]** Nothing reaches Google before the visitor opts in. The order inside
`src/components/head/tracking.astro` is normative, not stylistic:

1. the `is:inline` Consent Mode defaults — all four keys `denied`, plus
   `wait_for_update: 500`, `ads_data_redaction` and `url_passthrough`. It must be
   the first thing that touches `dataLayer`, or a tag can queue ahead of the
   defaults and run unrestricted;
2. the inline config block, which publishes the ids on `window`;
3. the module scripts, which register `bootstrapAnalytics()` on the gate and then
   boot the CMP. The GTM container is appended **inside**
   `onConsent('measurement')`, never before.

Consequences worth stating outright:

- **[HARD]** No `<noscript>` GTM iframe. The standard snippet's second half loads
  the container unconditionally, which is precisely the invariant above. A
  vendor checklist asking for it does not override this.
- GA4 is configured **inside the GTM container**, not in the app. New events are
  `dataLayer` pushes (`src/lib/analytics/data-layer.ts`) plus GTM-side config —
  adding a tag is not a code change.
- Consent Mode is the **basic** shape, deliberately: advanced sends cookieless
  pings for modeling, which needs roughly 1k daily events on each side of the
  consent split to produce anything — traffic a site this size won't have.
- `mapPreferenceToConsentMode()` is fail-safe by construction: anything not
  explicitly `true` maps to `denied`. Purpose ids `4` (measurement) and `5`
  (marketing) are iubenda's numbering — don't renumber them.
- `consentOnContinuedBrowsing: false` **[HARD]** — scroll or continued browsing
  is not valid consent under the Garante's 2021 cookie guidelines.
  `floatingPreferencesButtonDisplay: false` is acceptable only because consent
  stays revocable through the footer's `.iubenda-cs-preferences-link`. Keep that
  link if you keep the flag.
- Only `iubenda_cs.js` loads — no autoblocking, no GPP stub. Autoblocking would
  add a parser-blocking request and a second source of truth for a gate the app
  already owns.
- Turning any of this on **requires widening the CSP**. The exact source lists
  are in the header comment of `src/components/head/tracking.astro`; the rules
  for editing them are in § Content-Security-Policy above.

## Rebuilding the legal pages after a policy change

The privacy and cookie policies are fetched from iubenda **at build time**
(`src/lib/legal/documents.ts`, prerendered pages). An edit made in the iubenda
dashboard is therefore invisible to the live site until someone redeploys, and
nothing warns anyone that the two have drifted.

- Publish the change on iubenda, then trigger a production deploy.
- Without a policy id configured, the pages serve their placeholder draft
  instead. That fallback is silent by design on the page, but never in the log:
  a failed fetch prints to the build output — check there when a page shows the
  draft you didn't expect.

## After every release

`pnpm smoke:prod` runs automatically in the `deploy` job and fails it. It checks
the served routes, the security headers, the absence of `X-Robots-Tag` on the
production host, and that the BotID challenge really is proxied.

It hits the **apex**, not the `*.vercel.app` URL `vercel deploy` prints. Pass a
URL explicitly to smoke anything else: `pnpm smoke:prod https://…`.

## Rollback

Production is live and broken:

1. Vercel dashboard → Deployments → the last known-good **production**
   deployment → *Promote to Production*. This is the fast path; it changes no
   code.
2. Confirm with `pnpm smoke:prod` against the apex.
3. Then fix forward on a branch. Do **not** delete the bad tag — release-please
   reads the tag history, and removing one desynchronises the next version bump.
   Ship the fix as a new patch release instead.

## Environment variables

- Every key is declared in `astro.config.mjs` → `env.schema` with an explicit
  `context`/`access`, and documented in `.env.example`.
  **[HARD]** `.env.example` carries key names and intent, never real values;
  `.env`/`.env.local` are gitignored and must never be read into a report, a log
  or a commit.
- `context: 'client'` (and by convention the `PUBLIC_` prefix) means the value is
  **inlined into the bundle** — public by construction. A secret there is a leak,
  regardless of how the deploy provider labels it.
- Recurring pattern for anything vendor-backed: declare it `optional`, then
  **no-op in dev and refuse explicitly in production** when it's missing
  (`BREVO_API_KEY` is the reference). Silence is the failure mode to avoid — a
  form that "succeeds" while dropping the lead is worse than an error.
- On Vercel, create build-time-readable variables as **Plain**, not Sensitive:
  the build reads env at `vercel pull` time, and a Sensitive value isn't
  available there (`BOTID_ENFORCE` is the live example). A Sensitive variable
  doesn't fail loudly either — it arrives as the literal string `[SENSITIVE]`,
  which is why the iubenda ids are validated as numeric before use
  (`src/lib/analytics/tracking.ts`, `src/lib/legal/documents.ts`) rather than
  spliced into an API URL.
- Feature flags default to the safe side and are flipped in the provider once
  verified on a real deploy — `BOTID_ENFORCE=false` ships observe-only because a
  false positive silently costs a lead (`forms-email.md` § Abuse protection has
  the promotion path).
- Repo secrets for the release pipeline: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, plus `RELEASE_PLEASE_TOKEN` — scopes and rationale in
  `HOW_TO_USE.md` § Release secrets. The full list is printed by
  `scripts/bootstrap-github.sh` when it finishes.

## Release flow

- Conventional Commits, enforced by commitlint on a lefthook `commit-msg` hook.
- Squash-merge only, with an **empty** commit body
  (`squash_merge_commit_message=BLANK`, set by `bootstrap-github.sh`).
  release-please parses body lines too, so anything left there re-lists the same
  change in the CHANGELOG.
- Consequence: a breaking change is marked with `!` in the **PR title**
  (`feat(ui)!: …`). A `BREAKING CHANGE:` footer never survives the squash.
- Same reason: `Closes #N` goes in the PR description, not in the commit message.
- **[HARD] Only `feat` and `fix` cut a tag**, and only a tag deploys. Listing a
  type in `changelog-sections` governs how it is *displayed*, never whether it
  releases — so a change merged as `chore`/`docs` reaches `main` and stops
  there, silently. That is why `.github/dependabot.yml` emits `fix(deps)` and
  why content edits are titled `fix(content): …`. The failure has no symptom:
  CI is green, the PR is merged, and production keeps serving the old build.

## Go-live checklist

1. `SITE.url` is the real domain (it feeds every canonical, OG and hreflang URL,
   and `pnpm smoke:prod` refuses to run while it's the placeholder).
2. Domain added in Vercel, DNS pointed, HTTPS issued. Decide the canonical host
   (apex or `www`) and declare the redirect in `vercel.json`.
3. Ignored Build Step set to `bash scripts/vercel-ignore-build.sh`.
4. `bash scripts/bootstrap-github.sh` run against the repo (idempotent).
5. Repo secrets set; the first release-please PR merged.
6. Sender domain's DKIM/SPF/DMARC verified in Brevo, `CONTACT_*` and
   `BREVO_API_KEY` set in the Vercel project.
7. A real browser submit of the contact form seen arriving; then consider
   `BOTID_ENFORCE=true`.
8. `pnpm smoke:prod` green against the apex.
9. **DPA signed with every processor that touches personal data** — hosting
   (Vercel), the email/CRM vendor (Brevo), the CMP (iubenda), plus anything else
   the project added. The client's legal contact is the signatory, not you.
10. **Every credential used during development rotated.** Anything that lived in
    a `.env`, a shared note or a preview environment is burned: issue new values,
    set them in production, revoke the old ones. Same for the repo secrets.
11. **Consent flows verified on a preview**, both accept and reject, with GA4
    Realtime open: no Google request before opt-in, events flowing after. This
    is also the only place a missing CSP entry shows up.
12. **Security headers verified on a preview** — no CSP violation on any page
    type, HSTS present, `X-Robots-Tag` on `*.vercel.app` and absent on the
    production host.
13. **Whoever maintains the iubenda policy knows the rebuild runbook** above: an
    edit there is invisible until a redeploy, and nothing warns them.
