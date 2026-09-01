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
  integration only ever produces **preview** deploys. Dependabot branches are cut
  earlier still, by `git.deploymentEnabled` in `vercel.json`.
- **Before the first release tag there is no deployment at all**, preview or
  production. Early milestones are verifiable only with `pnpm dev` and
  `pnpm run build` — worth knowing before promising a client a link.
- The production deploy is `.github/workflows/deploy.yml`: it checks out the
  released **tag** (not whatever `main` points at by then), then `pnpm run ci` →
  `vercel pull --prod` → `vercel build --prod` → `vercel deploy --prebuilt --prod`
  → `pnpm smoke:prod`.
- **It has two entry points and one path.** `release-please.yml` calls it on a
  fresh tag; Actions → Deploy → *Run workflow* dispatches it by hand, blank input
  meaning the most recent tag. Use the button when production must be rebuilt
  without a code change — a rotated secret, a republished iubenda policy, a
  rollback to an older tag. It refuses a ref that isn't a tag, so the dispatch
  can't quietly ship a branch.
- The job is gated on `check-vercel-secrets`: with `VERCEL_TOKEN` /
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` unset it emits a notice and skips — a
  fresh fork never fails CI just because it isn't connected to Vercel yet. The
  two ids come from the local link under `.vercel/` (gitignored): `project.json`
  after a plain `vercel link`, or `repo.json` after `vercel link --repo`, where
  the same values are `projects[].orgId` and `projects[].id`.
- The Vercel CLI is **version-pinned** (`pnpm dlx vercel@58`) in the `deploy`
  job — Dependabot doesn't watch `pnpm dlx`, so bump it deliberately.

**Why `RELEASE_PLEASE_TOKEN` is a separate secret.** A PR opened with the default
`GITHUB_TOKEN` does not trigger workflows — GitHub's anti-recursion safeguard —
so without the PAT the release PR never gets a `ci` check. The workflow falls
back to `GITHUB_TOKEN`, so it still works; the release PR just merges unchecked.

### What the deploy job does, and why

Every line in `deploy.yml` earns its place:

- **`fetch-depth: 0`** on the checkout. `actions/checkout` fetches no tags at its
  default depth, and the tag resolution below needs them.
- **The ref reaches the shell through `env:`, never `${{ }}` inside `run:`** —
  that splice is script injection, and the input is attacker-controllable on a
  `workflow_dispatch`.
- **`git checkout --detach` on the resolved tag**, not on `main`: without it a
  commit merged between the release and the deploy would ship untagged.
- **`corepack enable` before `setup-node`** — pnpm's version comes from
  `package.json#packageManager` and Node's from `.nvmrc`. Never pin either in the
  workflow file, or the repo has two sources of truth.
- **`environment: production`**, so GitHub records deployments and required
  reviewers can be added later without touching the workflow.

`regions` in `vercel.json` is `fra1`, and is worth a deliberate decision per
fork: a build emits a single `_render` function reached by `/_actions`,
`/_image` and `/_server-islands`, so pin the region near the audience (left
unset, Vercel defaults to `iad1`, US East). Prerendered pages are unaffected —
static files off the CDN, whatever the function region.

## The gate chain

Five gates, each covering a moment the others don't:

| Gate | Where | Covers |
|---|---|---|
| `ci` required check | `main` ruleset, from `scripts/bootstrap-github.sh` | everything that lands on `main` |
| `pnpm run ci` | `deploy` job, on the tag | what ships from the tag |
| `pnpm perf:bundle` | `ci.yml`, after the build | client JS per route |
| `fallow dead-code --boundary-violations` | `ci.yml`, `fallow` job | imports crossing the zones in `.fallowrc.jsonc` |
| `pnpm smoke:prod` | `deploy` job, after the deploy | what the edge actually serves |

- **`pnpm run ci` on the tag is not redundant.** `vercel build` is `astro build`:
  it type-checks nothing and runs no test.
- **The boundaries gate is the one that fails remotely on a locally-green
  branch** — it is deliberately outside `pnpm run ci`. Run `pnpm exec fallow
  dead-code --boundary-violations` by hand after moving code between zones.
  (`fallow review`, in the same job, is advisory and always exits 0.)
- **`ci.yml` skips nothing on `pull_request`.** Its `paths-ignore` covers pushes
  to `main` only: the ruleset requires the check, and a skipped job reports *no*
  status at all — so a PR that skipped it hangs forever on "Expected — Waiting
  for status" rather than failing.
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
such case). The CSP is the one exception, and it goes the other way: all of it
except `frame-ancestors` is generated at build time — § Content-Security-Policy.

`git.deploymentEnabled` also lives here, with `dependabot/**` set to `false`:
dependabot branches get no preview deploy at all.

Because none of it runs locally, each rule is pinned by a declarative test —
that's the only pre-deploy signal there is:

| Test | Guards |
|---|---|
| `src/vercel-headers.test.ts` | the six unconditional security headers, and that `frame-ancestors` is the *only* CSP directive here |
| `src/vercel-robots.test.ts` | the `*.vercel.app` noindex rule, and that it never matches the custom domain |
| `src/vercel-botid.test.ts` | the BotID proxy rewrites and the `X-Frame-Options` override's position |
| `src/lib/csp/csp.test.ts` | every other CSP directive — see § Content-Security-Policy |

Rule order matters and the tests encode it: **the last matching header rule
wins**, so the `SAMEORIGIN` override for the BotID path has to sit *after* the
global `DENY`.

Preview deploys are noindexed by a `has: host` header rule, not by
`src/middleware.ts` — see `seo.md` § Preview deploys.

## Content-Security-Policy

The policy is **built at build time, not declared in `vercel.json`**. Two halves,
split by what a `<meta>` CSP can express:

- `vercel.json` carries `frame-ancestors 'none'` and nothing else — it is the one
  directive a `<meta>` CSP ignores, so it has to travel as a header.
- Everything else is generated by `cspIntegration()`
  (`src/lib/csp/integration.ts`), registered in `astro.config.mjs`. On
  `astro:build:done` it hashes every executable inline script under the build
  output and injects the policy as a `<meta>` right after `<meta charset>` —
  a meta CSP governs only what follows it, so it has to precede every script.

`script-src` therefore carries SHA-256 hashes plus `'self'`, and **never**
`'unsafe-inline'` (`src/lib/csp/csp.test.ts`). Three consequences that are not
obvious from reading either file alone:

- **Every page carries the union of the hashes**, not its own. `ClientRouter`
  swaps the `<head>`, not the policy, so the first page loaded governs the whole
  session — a per-page policy would break on the second navigation.
- **Only prerendered HTML is covered.** The integration walks the emitted
  `.html`; an on-demand route returning HTML with an inline script needs its own
  policy.
- **`style-src` keeps `'unsafe-inline'` deliberately.** Hashing styles would make
  the keyword inert and break every scoped `<style>` Astro emits — which is also
  why Astro's native `security.csp` is not used here.

The rule that decides whether a vendor touches the CSP at all:

- **Server-only vendor → no CSP change.** Brevo is called from an Astro Action on
  the server; nothing about it reaches the browser, so `connect-src` stays out of
  it. Adding an origin "to be safe" widens the policy for nothing.
- **Client-side vendor → one directive per behavior**, added explicitly. Never a
  wildcard when the vendor documents concrete hosts.
- **Consent doesn't enter the decision.** An origin contacted regardless of what
  the visitor chooses (an image CDN, say) belongs in the policy either way. The
  gate decides *when* a script runs, never whether its origin is allowed.

- **Adding a vendor means editing `src/lib/csp/directives.ts`**, never
  `vercel.json`: widen the *specific* directive it needs (`script-src`,
  `connect-src`, `img-src`, `frame-src`), never `default-src`, and update
  `src/lib/csp/csp.test.ts` in the same commit.
- One missing entry fails **silently** in a way local dev cannot show: `astro
  dev` never reads `vercel.json`, and the build-time injection only runs on a
  real build. Deploy a preview and watch the console on both the accept and the
  reject path before calling it done.
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
- Turning this on needs **no CSP change**: `src/lib/csp/directives.ts` already
  carries the GTM and iubenda hosts on every directive they touch, and both
  bootstraps append their script through `createElement('script').src`
  (`src/lib/analytics/bootstrap.ts`), which the host allowlist covers — no hash
  is involved. A vendor *beyond* this set is a `directives.ts` change, under the
  rules in § Content-Security-Policy above.

## Rebuilding the legal pages after a policy change

The privacy and cookie policies are fetched from iubenda **at build time**
(`src/lib/legal/documents.ts`, prerendered pages). An edit made in the iubenda
dashboard is therefore invisible to the live site until someone redeploys, and
nothing warns anyone that the two have drifted.

- Publish the change on iubenda, then trigger a production deploy
  (Actions → Deploy → *Run workflow*, no code change needed).
- **[HARD] Configured means required.** Without a policy id the pages state that
  the document isn't available — the template's default, and deliberately not
  placeholder legal prose, which on a live page reads as a real policy. But once an id IS set, a
  production build that cannot fetch the policy **fails** rather than falling
  back: the fallback carries a visible "draft, not yet legally reviewed" notice,
  and publishing that in place of a client's real policy over one transient
  network error is not a degradation worth accepting. A red build on a flaky
  iubenda is the cheap outcome; re-run the deploy. Dev still falls back, so a
  bad connection cannot stop `astro dev`.

## Health & monitoring

`/api/health` (`src/pages/api/health.ts`) is the liveness endpoint — the URL to
hand to an uptime monitor. It is **on-demand on purpose** (`prerender = false`):
prerendered, its `ts` would pin to build time and the endpoint would keep
answering 200 long after the site stopped working. `no-store` and
`X-Robots-Tag: noindex` for the same reason — a cached liveness check is not one.

There is no error monitoring and no analytics beyond the consent-gated GTM
container. Both are deliberate omissions in a template, not oversights: a fork
adds what its project needs.

## After every release

`pnpm smoke:prod` runs automatically in the `deploy` job and fails it. It checks
the served routes (`/api/health` included), the security headers, the absence of
`X-Robots-Tag` on the production host, and that the BotID challenge really is
proxied.

It hits the **apex**, not the `*.vercel.app` URL `vercel deploy` prints. Pass a
URL explicitly to smoke anything else: `pnpm smoke:prod https://…`.

## Runbook

**Ship a release** — merge the feature PRs (squash, Conventional title), then
merge the release PR release-please keeps open. The tag, the GitHub release and
the production deploy follow on their own; the deployment URL is echoed in the
job log and recorded on the `production` environment. Confirm with
`pnpm smoke:prod` against the apex.

**Check a preview** — every pushed branch gets one except `main`,
`release-please--*` and `dependabot/**`, with no PR required. Preview hosts are
noindexed by the `vercel.json` rule; confirm with
`curl -sI https://<preview>.vercel.app/ | grep -i x-robots-tag`.

**Roll back** — see below.

## Rollback

Production is live and broken:

1. Vercel dashboard → Deployments → the last known-good **production**
   deployment → *Promote to Production*. This is the fast path; it changes no
   code.
2. Confirm with `pnpm smoke:prod` against the apex.
3. Then fix forward on a branch. Do **not** delete the bad tag — release-please
   reads the tag history, and removing one desynchronises the next version bump.
   Ship the fix as a new patch release instead.

Promoting reuses the old build as-is. When the fix is *outside* the code — a
corrected env var, a republished policy — that build has to be made again:
Actions → Deploy → *Run workflow*, with the tag to rebuild. Same gates, so a
rebuild can't ship something the release path would have caught.

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
  spliced into an API URL. **`vercel env add` stores Sensitive by default**, so
  pass `--no-sensitive` and confirm with a `vercel pull` before trusting it —
  otherwise the deployed function receives `[SENSITIVE]` as its API key.
- **An account without Production access reports variables as absent, not
  forbidden.** The CLI lists nothing where a variable does exist, so check
  `vercel whoami` before concluding one is missing.
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
