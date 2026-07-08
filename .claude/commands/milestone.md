---
description: Seed a milestone as a native GitHub Milestone + one issue per sub-task, from a docs/milestone-templates/*.md template or a hand-written docs/ROADMAP.md section. Never writes application code, never branches, never commits — implementation happens per-issue via /pr <N>.
argument-hint: <template-name> | <milestone-number>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, ToolSearch, AskUserQuestion, EnterPlanMode, ExitPlanMode
---

# /milestone — Seed a milestone's issues

Arguments: **$ARGUMENTS** → either the name of a file in `docs/milestone-templates/<name>.md` (without extension), or a milestone number `<N>` matching an existing `## Milestone N` heading in `docs/ROADMAP.md`.

Working model: **`/milestone` only seeds** — it turns a template or a hand-written ROADMAP section into a native GitHub Milestone plus one GitHub issue per sub-task, after a single plan-mode approval covering the whole batch. It never writes application code, never creates a branch, never spawns implementation agents, never commits. Implementation happens later, one issue at a time, via `/pr <issue-number>`.

If `$ARGUMENTS` is empty, or doesn't match a template file or an existing ROADMAP milestone number, **stop and show the available options** (list `docs/milestone-templates/*.md` filenames + descriptions, and list ROADMAP milestone numbers not yet fully seeded).

`gh milestone` does **not exist** as a `gh` CLI subcommand — the milestone object is only reachable through `gh api repos/{owner}/{repo}/milestones`. Never write `gh milestone create` anywhere in this command.

## Phase 1 — Pre-flight (read-only)

1. `git rev-parse --is-inside-working-tree`. If it fails, stop.
2. Clean working tree (`git status --short`) — the only change this command makes is to `docs/ROADMAP.md`, and it needs a clean base. If dirty, stop and ask.
3. Current branch should be `main` (this command no longer creates a dedicated branch). If not, warn and ask for confirmation.
4. `gh auth status` and `gh repo view --json owner,name` — confirms `gh` is authenticated and the remote resolves. Fail fast with a clear message if not (a freshly-forked project may not have `gh` set up yet).
5. Parse `$ARGUMENTS`: matches `docs/milestone-templates/<arg>.md` → **template path**; parses as an integer matching an existing `## Milestone <N>` heading → **bespoke path**; neither → stop, list available options.
6. Idempotency / duplicate guard:
   - Template path: if `docs/ROADMAP.md` already has a section with `**Source:** template <same name>`, stop and ask explicit confirmation before instantiating a second copy.
   - Bespoke path: if every sub-task in that section already has an issue number recorded, stop and report "already seeded — use `/pr <issue-number>` on the issues listed" instead of re-seeding. If only some sub-tasks have one, proceed but only seed what's missing (safe to re-run, same idempotency spirit as `scripts/bootstrap-github.sh`).
7. Read `docs/DECISIONS.md` — informational only: surface relevant open items in the plan (Phase 3) and the summary (Phase 5), never blocking.

## Phase 2 — Load the source

**Template path:**
1. Read `docs/milestone-templates/<arg>.md`. Parse front-matter (`name`, `description` — informational).
2. Scan the body for distinct `{{snake_case}}` tokens. Ask about all of them in one batched `AskUserQuestion` call.
3. Substitute every `{{token}}` with the collected value.
4. Determine the next milestone number `N` = 1 + the highest `## Milestone <N>` heading already in `docs/ROADMAP.md`. **Special case**: if the only section present is the untouched scaffold placeholder, treat ROADMAP.md as empty (`N = 1`), and that placeholder section gets **replaced**, not appended after — this is the real first-run state of every freshly-forked project.

**Bespoke path:**
1. Read the `## Milestone N` section as-is — `N` is already fixed by the heading, no placeholder substitution.

**Both paths — parse sub-tasks:**
- Template path: split on `### <n>. <title>` headings; extract `**Agent:**`, `**Labels:**`, remaining prose+checklist as the issue body.
- Bespoke path: split on `### N.x <slug>` headings (existing convention); no `**Agent:**` metadata available, so derive it from this domain table (kept identical, verbatim, in `.claude/commands/pr.md`):

  | Domain | Agent | Signals |
  |---|---|---|
  | Content collections, Zod schemas, MDX/Markdown, i18n content | `content-agent` | `src/content/**` |
  | Astro components, interactive islands, markup/a11y | `ui-agent` | `src/components/**` (non-content) |
  | Meta tags, JSON-LD, sitemap/robots, OG | `seo-agent` | `src/lib/head-seo*`, canonical/hreflang |
  | Forms, Astro Actions, email | `forms-agent` | `src/actions/**`, `src/emails/**` |
  | Prerender/SSR, images, bundle | `perf-rendering-agent` | `astro.config.mjs`, `prerender` |
  | Vercel/env/deploy | `ops-agent` | `vercel.json`, `scripts/vercel-ignore-build.sh` |
  | None of the above | `general-purpose` | generic refactor, tooling |

## Phase 3 — Plan mode: issue-by-issue preview

Enter plan mode.

1. Write `.claude/plans/milestone-NN-slug.md` (gitignored). For each sub-task: exact issue title, exact issue body (prose + checklist + the two HTML comments, byte-for-byte what `gh issue create --body-file` will receive), suggested agent, labels. Plus the GitHub Milestone about to be created (title: `Milestone N — <name>`).
2. `AskUserQuestion` for any ambiguity affecting the plan.
3. The user iterates, or approves with `ExitPlanMode` — **this single approval covers creating the whole batch**. No second per-issue confirmation.

## Phase 4 — Creation (autonomous, after approval)

1. **Dedup check** before creating: `gh api repos/{owner}/{repo}/milestones -f state=all --method GET --jq '.[] | select(.title=="Milestone N — <name>") | .number'` (the `--method GET` forces a read despite the `-f` flag — this is a safety check against a stale/reset `docs/ROADMAP.md` no longer matching what's really on GitHub, not just trusting the local file). If found, reuse that milestone number instead of creating a duplicate.
2. Otherwise, create it:
   ```bash
   gh api repos/{owner}/{repo}/milestones -f title="Milestone N — <name>"
   ```
   Always the literal `{owner}/{repo}` placeholder — `gh` resolves it from the current repo's remote; this keeps the command file byte-identical and safely re-runnable across every project forked from this template. Capture `number` and `html_url`.
3. For each sub-task, in ROADMAP order: write the rendered issue body to `.claude/plans/milestone-NN-slug.issue-<k>.body.md` (gitignored, left on disk for audit), then:
   ```bash
   gh issue create --title "<title>" --body-file <path> --milestone "Milestone N — <name>" [--label <label>]
   ```
   (omit `--label` if `**Labels:**` was empty). Parse the issue number from the returned URL; keep a sub-task → issue-number mapping.
4. Update `docs/ROADMAP.md`: write/replace the `## Milestone N` section with `**GitHub Milestone:** #N (<html_url>)`, a `Sub-task | Issue` table with the created numbers, Status table row → `🟡 seeded`.
5. **Do not commit** — this leaves `docs/ROADMAP.md` as an uncommitted change; only issue/milestone creation via `gh` is the autonomous part.

## Phase 5 — Handoff

Summary: Milestone (number, title, URL); every issue (number, title, URL) in order; confirmation `docs/ROADMAP.md` was updated; ready-to-copy:

```bash
git add docs/ROADMAP.md
git commit -m "docs: seed milestone N — <name> issues (#X-#Y)"
```

Next step: "run `/pr <issue-number>` for each issue above, in any order."

## Non-negotiable constraints

- **Never** `git commit`, `git push`, `gh pr create`, or `gh issue close`/`delete`/`reopen` — the user's job (or automatic on merge via `Closes #N`).
- **Never** modify `docs/PROJECT.md`.
- **Never** modify `.env` or read/log its real values.
- Respect all `[HARD]` rules in `CLAUDE.md`.

## Operational notes

- Files in `.claude/plans/` (including the per-issue `.body.md` files) are local and gitignored.
- If a sub-task doesn't touch any specific vertical, use `general-purpose` rather than forcing a domain that doesn't fit.
