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
- The Vercel CLI is **version-pinned** (`pnpm dlx vercel@58`) in the job and in
  every runbook below. `pnpm dlx` without a version resolves whatever is latest
  at release time, and Dependabot doesn't watch it — bump the major in both
  places in the same PR.

Not configured here, worth a deliberate decision per fork: `regions` in
`vercel.json`. The default is `iad1` (US East); a build emits a single `_render`
function reached by `/_actions`, `/_image` and `/_server-islands`, so if the
audience is elsewhere, pin the region near it. Prerendered pages are unaffected —
static files off the CDN, whatever the function region.

## The gate chain

Four gates, each covering a moment the others don't:

| Gate | Where | Covers |
|---|---|---|
| `ci` required check | `main` ruleset, from `scripts/bootstrap-github.sh` | everything that lands on `main` |
| `pnpm run ci` | `deploy` job, on the tag | what ships from the tag |
| `pnpm perf:bundle` | `ci.yml`, after the build | client JS per route |
| `pnpm smoke:prod` | `deploy` job, after the deploy | what the edge actually serves |

- One required context covers Biome + `astro check` + vitest + build + bundle
  budget, because `ci.yml` runs all of it in a single `ci` job.
- **`pnpm run ci` on the tag is not redundant.** `vercel build` is `astro build`:
  it type-checks nothing and runs no test. And the ruleset sets
  `strict_required_status_checks_policy: false`, so two PRs each green against an
  older `main` can both merge and leave `main` red on their combination.
- `perf:bundle` stays out of the `deploy` job: it reads `dist/client`, which
  `vercel build` never emits.

**[HARD]** Nobody bypasses the ruleset — `bypass_actors` is empty, admins
included. The emergency exit is disabling it in Settings → Rules, which the audit
log records; there is no silent path around it. release-please needs no bypass:
it opens a PR like everyone else, and cuts the tag only after the merge.

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
`src/middleware.ts`: a page with `export const prerender = true` is a static file
and never reaches middleware. See `seo.md` § Preview deploys.

## Content-Security-Policy

The template ships a **self-only** policy. `src/vercel-headers.test.ts` pins the
exact source list per directive, not a superset — so adding a vendor is a
deliberate two-file change (the policy and the test), never a side effect of
pasting a snippet.

- Adding a vendor: widen the *specific* directive it needs (`script-src`,
  `connect-src`, `img-src`, `frame-src`), never `default-src`, and update the
  test in the same commit.
- `'unsafe-inline'` on `script-src` is load-bearing today: the theme script must
  run before first paint to avoid a flash, so it can't be an external module. The
  upgrade path is per-page SHA-256 hashes computed at build time by an
  `astro:build:done` integration, which lets `'unsafe-inline'` be dropped.
- `'unsafe-eval'` is refused and nothing here needs it.
- BotID needs **no** CSP entry: its challenge is proxied same-origin through the
  `vercel.json` rewrites, which is also what keeps ad-blockers out of the way.

## After every release

`pnpm smoke:prod` runs automatically in the `deploy` job and fails it. It checks
the served routes, the security headers, the absence of `X-Robots-Tag` on the
production host, and that the BotID challenge really is proxied.

It hits the **apex**, not the `*.vercel.app` URL `vercel deploy` prints: on that
host the noindex is there by construction, so the check would report the opposite
of the truth. Pass a URL explicitly to smoke anything else:
`pnpm smoke:prod https://…`.

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
  available there (`BOTID_ENFORCE` is the live example).
- Feature flags default to the safe side and are flipped in the provider once
  verified on a real deploy — `BOTID_ENFORCE=false` ships observe-only because a
  false positive silently costs a lead (`forms-email.md` § Abuse protection has
  the promotion path).
- Repo secrets for the release pipeline (`gh secret set <NAME>`, or Settings →
  Secrets and variables → Actions): `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, plus `RELEASE_PLEASE_TOKEN` when CI has to run on
  release-please's own PR — with only `GITHUB_TOKEN`, GitHub's anti-recursion
  safeguard means that PR gets no CI at all. The full list is printed by
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
