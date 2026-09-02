---
description: Implement a GitHub issue end-to-end (branch → implementation → gates → PR body with Closes). Never commits/pushes/opens a PR — that's the user's job.
argument-hint: <issue-number> [--from <branch>]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, ToolSearch, AskUserQuestion, EnterPlanMode, ExitPlanMode
---

# /pr — issue → PR

Arguments: **$ARGUMENTS** → `<N>` (issue number, required) + optional `--from <branch>` (base branch other than `main`). If `<N>` is missing, not an integer, or the issue doesn't exist or is closed → **stop and ask**.

Model: **one issue = one PR**. Dedicated branch, **one Conventional commit** (type/scope from the issue title), **squash** merge. The PR feeds into release-please's rolling release PR (or triggers a new one for `feat`/`fix`). Linked via **`Closes #<N>`** in the body → the issue closes on merge.

**[HARD]** Never `git commit`/`push`/`gh pr create`, `gh issue close`/`delete`/`reopen`, or execute the milestone-closing command from Phase 5 — those are the user's job (or happen automatically on merge). Never touch `docs/PROJECT.md`. Never `.env`, never dependencies undocumented in `CLAUDE.md`/`docs/ARCHITECTURE.md` (ask via `AskUserQuestion` if unsure). Respect every `[HARD]` rule in `CLAUDE.md`.

## Phase 1 — Pre-flight (read-only)

1. `git rev-parse --is-inside-working-tree`; clean working tree (`git status --short`, otherwise stop/ask: stash/commit/abort); `git fetch origin` + `main` up to date (no auto-pull).
2. `gh issue view <N> --json number,title,body,state,labels,milestone,url`. From the **title**, extract Conventional `type`/`scope` (if it isn't Conventional → derive from labels `bug`→`fix`/`enhancement`→`feat` — both exist by default on any GitHub repo — or ask). **Body + `- [ ]` checklist** = spec, every item must be covered.
3. Look for `<!-- suggested-agent: X -->` in the body (present on issues seeded by `/milestone`). If present, that's the primary signal for which vertical agent(s) to use in Phase 3. If absent (a hand-created issue), derive it from this domain table (kept identical, verbatim, in `.claude/commands/milestone.md` — slash commands can't share code):

   | Domain | Agent | Signals |
   |---|---|---|
   | Content collections, Zod schemas, MDX/Markdown, i18n content | `content-agent` | `src/content/**` |
   | Astro components, interactive islands, markup/a11y | `ui-agent` | `src/components/**` (non-content) |
   | Meta tags, JSON-LD, sitemap/robots, OG | `seo-agent` | `src/lib/seo/**`, `src/components/head/**` |
   | Forms, Astro Actions, email | `forms-agent` | `src/actions/**`, `src/emails/**` |
   | Prerender/SSR, images, bundle | `perf-rendering-agent` | `astro.config.mjs`, `prerender` |
   | Vercel/env/deploy | `ops-agent` | `vercel.json`, `scripts/vercel-ignore-build.sh` |
   | None of the above | `general-purpose` | generic refactor, tooling |

## Phase 2 — Branch

`<type>/<N>-<slug>` (kebab slug, 3-5 words, from the title; e.g. `refactor/71-trailing-slash`). If it already exists, `git switch` into it (resuming); otherwise `git switch -c` from `main`/`--from`.

## Phase 3 — Plan (plan mode)

**First, look for a brief from `/approach`**: `grep -l "^### #<N> " .claude/plans/approach-*.md`. Those briefs cover a whole milestone, so read the file's *Decided* and *Order* sections for the shape agreed across the set, then the `### #<N>` block for this issue: its path, scope, constraints, and **which of the issue's claims did not survive** the check against the code — that last one is there so you don't re-discover it. Treat the decided path and scope as settled: the user chose them, don't re-open the choice. The brief's *Open* section is what still needs `AskUserQuestion` here. If the brief puts other issues before this one, say so and confirm before proceeding. Without a brief, plan from the issue body as before.

Expand the issue body into `.claude/plans/pr-<N>-<slug>.md`: files to touch, vertical-agent breakdown (1-3 agents, **exclusive** scope-paths — only if the surface is wide/parallelizable; otherwise work directly), quality gates, manual checks. `AskUserQuestion` for ambiguities that affect the plan. The user iterates / calls `ExitPlanMode` to approve.

Quality gate to plan for: **`pnpm run ci`** **→ `pnpm run check:comments --diff`** **→ `pnpm run audit:diff`** **→ `pnpm run build`**.

## Phase 4 — Implementation

1. Modifications: parallel agents with exclusive scope-paths if the surface is wide (prompt includes: exclusive scope, explicit **role = "implement"**, references to `CLAUDE.md`/`docs/ARCHITECTURE.md`, "don't commit"); otherwise direct edits.
2. **Overlap handling**: after parallel agents finish, check `git status` — if two agents touched the same file despite exclusive scopes, **stop this step**, don't auto-merge. Show the user both intended diffs and use `AskUserQuestion`: (a) the user resolves it manually and you re-run the gate, or (b) spawn one dedicated agent to reconcile the two changes coherently, then re-run from this step.
3. Cover **every checklist item** from the issue (flag any deferred one explicitly).
4. **Comment sweep** — spawn `comments-agent` with role **implement** over `git diff`, before the gate. It judges every comment the branch adds (yours and the other agents') against one test: does it carry a fact checkable **outside this file** — vendor behaviour, a measured number, a platform quirk, a named coupling with another file? If not, it goes. Predictions about our own code ("without this the layout breaks") read like invariants but are inferences drawn from the code itself, and they die here. The agent only ever removes comment lines, so the gate right after is proof enough that nothing broke. Run it even on code you wrote yourself: `check:comments` reads shape, not usefulness — a short useless comment passes it green.
5. Sequential quality gate: `pnpm run ci`, then `pnpm run check:comments --diff`, then `pnpm run audit:diff`, then `pnpm run build`. On failure, spawn a fix agent and re-run (max 2 attempts, then stop).
   - `check:comments` always exits 0, but **what it lists has to be resolved before handing off**: it flags comment blocks over two lines, files where comments exceed 15% of their lines, and comments narrating the change instead of describing the code. `--diff` narrows it to what this branch touched (merge-base against `origin/main`, untracked included), which is the scope to answer for here — run it bare to see the whole tree when the issue is about inherited debt. The rule is in `CLAUDE.md`.
   - `audit:diff` is `fallow audit`: dead code, complexity, duplication and styling **scoped to the diff**, exiting non-zero on a fail verdict. It judges only what this branch introduced — inherited findings are reported and excluded from the verdict, so pre-existing debt never blocks an unrelated issue. It picks its own base (merge-base against the remote default); pin it with `FALLOW_AUDIT_BASE` if that resolves wrong.
   - It runs before `build` on purpose: it takes under a second and catches what the expensive step never looks at.
6. **Review containment [HARD]**: any post-gate multi-agent review follows the "Multi-agent workflows" tiers in `CLAUDE.md` — small diff → none, the sequential gate above is enough; medium → at most one reviewer agent; large, or medium touching a risk area → a compact workflow within the caps there. Never auto-append a review workflow outside those tiers, whatever the session mode.
7. Update impacted docs (never `docs/PROJECT.md`, and never `docs/ROADMAP.md` — that's `/milestone`'s territory only, updated once at seeding time; GitHub's own issue/milestone state is the source of truth for per-issue progress).

## Phase 5 — Handoff

1. **Checklist sync**: once the quality gate is green and every issue checklist item is covered (or explicitly flagged as deferred), `gh issue edit <N>` to check off (`- [x]`) each satisfied `- [ ]` item directly in the issue body — edit only the checkbox markers, keep the rest of the body byte-for-byte identical (fetch with `gh issue view <N> --json body -q .body` first, flip the boxes, write back with `--body-file`). Leave any deferred item unchecked. This is a plain issue-body edit, not covered by the `gh issue close/delete/reopen` ban above — do it directly, no need to ask each time.
2. Run `pnpm run audit:brief` and write the **reviewer checks** from it, not from memory. It is the same analysis as the gate rendered as an orientation brief — review order, the files affected *beyond* the diff (impact closure), which units carry the risk, and any "decisions to make" the change forces. It always exits 0, so it informs the body without gating it.
3. Generate `.claude/plans/pr-<N>-<slug>.body.md` from `.github/PULL_REQUEST_TEMPLATE.md`, with **`Closes #<N>`**: what changes, DoD (check only what's verified), reviewer checks, notes.
4. **Milestone-closing suggestion**: if the issue's JSON has a `milestone`, run `gh issue list --milestone "<milestone title>" --state open --json number`. If the only open issue is `#<N>` itself (or the list is empty), print — **never execute**:
   ```bash
   # once this PR is merged (Closes #<N> closes the last open issue in the milestone):
   gh api -X PATCH repos/{owner}/{repo}/milestones/{milestone-number} -f state=closed
   # and update docs/ROADMAP.md by hand: Milestone N → 🟢 done
   ```
   (`milestone-number` — not the title — comes from the same `gh issue view --json milestone` call in Phase 1.)
5. Summary: issue, branch, `git status --short`, gate outcome, checklist covered/deferred, and the ready-to-copy commands:
   ```bash
   git diff
   git add -A && git commit -m "<type>(scope): <description from the issue title>"
   git push -u origin <type>/<N>-<slug>
   gh pr create --title "<type>(scope): <description>" --body-file .claude/plans/pr-<N>-<slug>.body.md
   # merge in SQUASH → feeds the release PR; #<N> closes on merge
   ```

## Notes

- The **type from the issue title** drives the commit and release-please's version bump — a breaking change needs `!` in the title (`feat(ui)!: …`), since the squash body is blank and a `BREAKING CHANGE:` footer would never reach release-please.
- `Closes #<N>` goes in the **PR description** (`--body-file`), and only there: the squash body is blank, so a keyword put in the commit message would never reach `main` and the issue would stay open.
- `.claude/plans/` is gitignored (`pr-<N>-<slug>.md` internal, `.body.md` for reviewers).
