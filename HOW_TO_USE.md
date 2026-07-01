# How to use this template

This repo is a personal/freelance starting point — clone it fresh for each new project rather than working directly in `astro-template` itself.

## Bootstrap a new project

1. Clone/duplicate this repo under the new project's name.
2. Rename `package.json#name` — it leaks into the changelog that release-please generates, so it should match the new project, not stay `astro-template`.
3. `corepack enable && pnpm install && pnpm dev` — installs dependencies and git hooks (lefthook), starts the dev server.
4. Create the GitHub repo, then run `bash scripts/bootstrap-github.sh` from inside it (needs `gh` authenticated) — sets up dependabot labels, squash-only merge policy, and Actions permissions for release-please.
5. Connect the repo to a Vercel project, then set **Settings → Build & Deployment → Ignored Build Step** to `bash scripts/vercel-ignore-build.sh` — production only ships from a release tag, not from every push.
6. Fill in `docs/ROADMAP.md` with the new project's real milestones (one milestone = one PR = one release) and `docs/PROJECT.md`/`docs/DECISIONS.md` if the project needs them — these stay empty scaffolds in the template itself.

## Release secrets

Release automation (`release-please.yml`) needs these secrets set manually on GitHub — `gh secret set <NAME>` from inside the repo, or Settings → Secrets and variables → Actions:

- `RELEASE_PLEASE_TOKEN` — fine-grained PAT with `contents:write` + `pull_requests:write`. Required because CI doesn't run on PRs opened with the default `GITHUB_TOKEN` (a GitHub Actions anti-recursion safeguard) — without this, release-please's own release PR would never get a `ci` check.
- `VERCEL_TOKEN` — Vercel access token (vercel.com/account/tokens).
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — from `.vercel/project.json` after running `vercel link` locally once.

Until all three Vercel secrets are set, the `deploy` job in `release-please.yml` skips cleanly (no failure) instead of running.

## Day-to-day workflow

- Implement a milestone with `/milestone <N>[.<x>]` — plan mode, then parallel vertical agents (`.claude/agents/`: content, UI, SEO, forms, rendering/performance, ops), never commits/pushes/opens a PR on its own.
- Vertical agents follow the matching guide in `docs/guides/*.md` when one exists; guides grow from real work rather than being written upfront (see `docs/guides/README.md`).
- Commits are Conventional Commits, validated on commit by lefthook + commitlint. PRs merge in squash only.

See `CLAUDE.md` for the full set of `[HARD]` project conventions, and `docs/ARCHITECTURE.md` for the stack overview.
