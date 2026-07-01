---
description: Start implementing a milestone (or one of its sub-tasks) from docs/ROADMAP.md, with plan mode and vertical agents in parallel. Never commits, pushes, or opens a PR — that's the user's job.
argument-hint: <milestone-number>[.<sub-task>]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, ToolSearch, AskUserQuestion, EnterPlanMode, ExitPlanMode
---

# /milestone — Start implementation

Arguments passed: **$ARGUMENTS**

Working model: **one milestone = one PR** (long-lived branch `milestone/NN-slug`) with **one conventional commit per sub-task**. Merge happens via **squash** → 1 commit per milestone on `main` → 1 release via release-please.

Extract from `$ARGUMENTS`:

- `<N>` — milestone number. Implements all sub-tasks not yet done.
- `<N>.<x>` (optional) — a single sub-task (e.g. `2.6`).

If `$ARGUMENTS` is empty, `<N>` is invalid, or it doesn't match anything in `docs/ROADMAP.md`, **stop and ask**.

---

## Phase 1 — Pre-flight (read-only)

1. `git rev-parse --is-inside-working-tree`. If it fails, stop.
2. Clean working tree (`git status --short`). If there are uncommitted changes, stop and ask how to proceed (exception: you're already on the `milestone/NN-slug` branch with previous sub-task commits).
3. Acceptable current branch: `main`, or the `milestone/NN-slug` branch of the milestone in progress. Otherwise warn and ask for confirmation.
4. Read `docs/ROADMAP.md`, extract the Milestone N section: name, branch slug, sub-tasks in scope.
5. Read `docs/DECISIONS.md` — it's **informational, not blocking**: if there are open items relevant to the milestone, flag them in the plan (Phase 3) and in the final summary (Phase 5), but don't stop for this.

## Phase 2 — Long-lived branch + context loading

1. Branch slug from `docs/ROADMAP.md` (`**Branch:**` field). If it doesn't exist yet, create it from `main`: `git switch -c milestone/NN-slug`. If it already exists, switch to it: `git switch milestone/NN-slug`.
2. Targeted context loading: the Milestone N section of `docs/ROADMAP.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md` if it exists and is relevant.
3. Spawn an **Explore** agent (breadth: "medium") to map existing files/folders relevant to the area of the sub-tasks in scope.

## Phase 3 — Planning

Enter **plan mode**.

1. Write/extend the plan in `.claude/plans/milestone-NN-slug.md` (gitignored, one file per milestone).
2. For each sub-task in scope, the plan includes:
   - **Context**: 2-3 lines on why this sub-task and what the deliverable is
   - **Expected conventional commit** (e.g. `feat(scope): <description>`)
   - **Files to create/modify**
   - **Vertical agents involved**, each with an **exclusive scope-path** (no filesystem overlap) and **role = implement**. Choose among `content-agent`, `ui-agent`, `seo-agent`, `forms-agent`, `perf-rendering-agent`, `ops-agent` based on what the sub-task touches — not every sub-task involves every agent. If the sub-task doesn't fit any vertical (e.g. a generic refactor), use `general-purpose`.
   - **Quality gate**: `pnpm run ci` (Biome + typecheck) and `pnpm run build`
   - **Manual checks** for the user, copy-paste-friendly
3. Use `AskUserQuestion` for ambiguities that affect the plan.
4. The user calls `ExitPlanMode` to approve, or iterates on the plan.

## Phase 4 — Implementation

Iterate over the sub-tasks in scope one at a time, in ROADMAP order.

1. Read the sub-task's section in the plan file (already approved).
2. For each vertical agent in the breakdown: spawn in parallel (single message, N `Agent` invocations). Each prompt includes: exclusive scope-path, **explicit role ("implement")**, the work spec, a reference to `CLAUDE.md` and to the plan file. Instruction: "don't commit, don't run `git`."
3. Wait for all of them to finish. Check for overlap with `git status`: if two agents modified the same file despite exclusive scope-paths, **stop this step** — don't attempt an automatic merge. Overlap usually means the plan's scope split wasn't actually exclusive, which is worth understanding rather than papering over. Show the user the overlapping file(s) with a diff from each agent's intended change, and use `AskUserQuestion` to decide: (a) the user resolves it manually and you re-run the quality gate, or (b) spawn one dedicated agent to reconcile the two sets of changes coherently, then re-run from step 3.
4. **Light review** (optional but recommended for non-trivial sub-tasks): re-spawn the same vertical agents involved with **role "review"** on the produced diff, prompt: "don't modify files, only check and report issues." If issues come up, spawn an agent to fix them and repeat the quality gate.
5. Sequential quality gate: `pnpm run ci` then `pnpm run build`. If it fails, spawn a dedicated agent to fix it and re-run (max 2 attempts, then stop).
6. Update `docs/ROADMAP.md`: mark the sub-task as done. Don't commit — it becomes part of the sub-task's commit.

## Phase 5 — Handoff

Generate/update `.claude/plans/milestone-NN-slug.body.md` (the milestone's PR body, one per milestone, extended with each sub-task): sections "What changes" (bullets, one per sub-task), "Quality gate" (outcome), "Relevant open decisions" (from `docs/DECISIONS.md`, if any), "Manual checks for the reviewer".

End with a summary that includes: branch, sub-tasks implemented in this session, `git status --short`, quality gate outcome, and ready-to-copy commands:

```bash
git diff
git add -A
git commit -m "feat(scope): <sub-task N.x>"
# repeat for each sub-task done in this session

# --- only once the milestone is complete ---
git push -u origin milestone/NN-slug
gh pr create --title "feat(scope): milestone NN — <name>" --body-file .claude/plans/milestone-NN-slug.body.md
# merge via SQUASH
```

## Non-negotiable constraints

- **Never** `git commit`, `git push`, `gh pr create`, or any other action with external effects — those belong to the user.
- **Never** introduce dependencies or stack choices not documented in `CLAUDE.md`/`docs/ARCHITECTURE.md`. If needed, stop and ask with `AskUserQuestion`.
- **Never** modify `.env` or read/log its real values.
- Respect all `[HARD]` rules in `CLAUDE.md`.

## Operational notes

- Files in `.claude/plans/` are local and gitignored.
- If a sub-task doesn't touch any specific vertical, use `general-purpose` instead of forcing it into a domain that doesn't fit.
