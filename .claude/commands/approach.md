---
description: Decide *how* to tackle a whole milestone before /pr starts implementing it. Read-only and organizational: checks what the issues claim against what the code actually says today, finds the dependencies and overlaps between them, settles the order with you, and writes the outcome to .claude/plans/. Never branches, never edits code, never commits.
argument-hint: [milestone-number]
allowed-tools: Bash, Read, Glob, Grep, Agent, ToolSearch, AskUserQuestion, WebFetch, Write
---

# /approach — milestone → decided order and shape

Arguments: **$ARGUMENTS** → `<N>`, a milestone *number*. **Omitted → the open issues that belong to no milestone**, which is the other set worth reasoning about as a whole. If `<N>` is given but no milestone with that number exists, list the open milestones and stop.

Working model: **`/approach` decides, `/pr` implements.** It works on a *set* of issues on purpose. One issue at a time hides what actually costs time on a milestone: two issues that touch the same files, one that must land before another, one that turns out to be already done, and three that would be one PR if anyone looked at them together.

`/pr` commits to a branch in Phase 2 and only plans in Phase 3 — so by the time an issue turns out to be stale or badly posed, you are already on a branch for it. This command runs before that, costs nothing to abandon, and its whole output is a conversation plus one gitignored file.

Issues are written at a moment in time. The code moves. The first job here is finding out **which parts of them are still true**.

**[HARD]** Read-only on the repository. Never `git switch`/`checkout -b`, never create a branch, never `git commit`/`push`, never `gh pr create`. Never edit application code, configuration, or documentation. Never edit, close or reopen an issue, never change a milestone. The **only** thing you may write is the brief under `.claude/plans/`. No implementation happens here — not even a one-line "obvious" fix.

**[HARD]** This is a decision made *with* the user, not a report handed to them. Every fork that changes what gets built, or in which order, goes through `AskUserQuestion`. Do not settle the order yourself and present it as decided.

## Phase 1 — The set as written

```bash
gh api repos/{owner}/{repo}/milestones/<N>                       # title, description, counts
gh issue list --milestone "<title>" --state open --limit 100 \
  --json number,title,body,labels,url
# no argument → the other set:
gh issue list --search 'no:milestone' --state open --limit 100 \
  --json number,title,body,labels,url
```

Read every body and its `- [ ]` checklist — that is each spec as it was understood when written — and the comments, where a decision may already have been taken and never folded back in. Note any `<!-- suggested-agent: X -->`.

**Then read `docs/ROADMAP.md`**, which knows things the issues don't:

- its **`## Dependencies`** section already declares the ordering between milestones. An order decided here that contradicts it is either wrong or means the roadmap is stale — say which, don't quietly pick one.
- its **`## Status`** legend (🔲 planned · 🟡 seeded · 🟢 done) says whether this milestone is even supposed to be in flight yet, and which ones precede it.
- its **`## Milestone <N>`** section is the intent this milestone was seeded *from*. Where the section and the issues disagree, the issues are what exist on GitHub, but the section is what was promised — a divergence is worth naming, and sometimes it is the roadmap that needs the update.

With no argument, there is no roadmap section to read: issues outside a milestone are by definition outside the plan. Read `## Dependencies` and `## Status` anyway — some of that backlog will turn out to belong to a milestone that already exists.

Produce the inventory: issue, what it claims, which paths it names, and where the roadmap places it. Do not treat any of it as fact yet.

## Phase 2 — What is actually true now

Investigate the repository as it is today. Spawn agents in parallel across the issues when the surface is wide — with an explicit **role = "investigate, read-only"** in the prompt, so a vertical agent that owns Write/Edit doesn't start fixing what it finds.

Per issue:

1. **Is it already done, or partly done?** The most valuable answer this command can give is "three of these are no longer needed". Check the actual files, not the issue's description of them.
2. **Do its claims still hold?** File lists, line counts and "X is missing" statements go stale fast. Verify each one. An issue whose spec has drifted needs rewriting before implementing, not around.
3. **What does the codebase already do here?** Find the existing pattern — a similar component, a prior migration, the guide in `docs/guides/` that governs the area. Implementing against the house pattern beats inventing a second one.

Then, and this is what makes the milestone view worth the run, **across the issues**:

4. **Dependencies.** Which must land before which, and why. A config change that another issue's tests depend on. An agent whose reference guide arrives in a different issue.
5. **Overlaps.** Which touch the same files. Two of those in flight at once means a conflict, and it is cheaper to sequence them than to resolve it.
6. **Grouping.** Which are one PR pretending to be three, and which are three pretending to be one. Say so — but changing the issues is the user's call, not yours.

Useful:

```bash
gh pr list --state merged --limit 20 --json number,title,files
git log --oneline -15 -- <paths named across the issues>
```

## Phase 3 — The real options

The choice at this level is rarely "how to implement issue X". It is usually one of:

- **the order** — by risk, by dependency, by what unblocks the most
- **the grouping** — one PR per issue, or one PR for a coherent cluster
- **the cut** — which issues to drop, defer or rewrite before starting

Put **two or three genuinely different** shapes on the table, not variations of one. For each: what it costs, and **what it forecloses**, which is the part that is expensive to discover later. If reconnaissance left only one viable shape, say so plainly and skip ahead — an invented alternative to look balanced wastes the user's attention.

Say which you would choose and why. A survey without a recommendation pushes the work back onto the user.

## Phase 4 — Decide together

`AskUserQuestion` on the forks that change the outcome or the order. Judgement calls with an obvious default are yours to make — state them and move on.

These outcomes are all legitimate, and the last three are wins rather than failures:

| Outcome | What follows |
|---|---|
| An order and shape are agreed | write the brief, start with the first issue |
| Some issues are already satisfied | say which, propose closing them — **never close them yourself** |
| Some are wrong, stale or too big | propose rewriting or splitting, and leave them out of the order |
| The milestone should not be started yet | say why, and stop |

## Phase 5 — The brief

Write `.claude/plans/approach-milestone-<N>-<slug>.md` (no argument → `.claude/plans/approach-backlog.md`). The directory is gitignored: this is working state, not a deliverable.

```markdown
# Milestone <N> — <title>

## Decided
<the shape agreed, in three sentences: grouping, and what drives the order.>

## Order
1. #<N> — <title> — <why here>
2. …
<issues deliberately excluded, and why: already done, to rewrite, deferred.>

## Per issue
### #<N> — <title>
- **Path**: <what gets built, and how>
- **Scope**: <files in scope; anything left out and why>
- **Constraints**: <house pattern, governing guide, what must land first>
- **Changed since written**: <which claims did not survive Phase 2 — this is
  what stops /pr from re-discovering them>

## Open
<what is still undecided and will need AskUserQuestion during /pr. Empty is a
good outcome.>
```

Then print: the order in a few lines, which issues need their body updated before being worked, and `/pr <first issue number>` as the next command. If the outcome was "not yet" or "rewrite first", print that instead — **no `/pr` suggestion**.

## Notes

- Running this again on the same milestone is cheap and expected: the second run reads the existing brief, checks what moved, and updates it. Do it after a few PRs land — the order decided at the start is a hypothesis.
- `/pr` Phase 3 looks for its issue inside these briefs. It does not replace `/pr`'s plan, which lists files, agents and gates. This one answers the question above it: *is this the right thing to build, in which shape, and in which order.*
- Nothing here writes to GitHub. Closing, rewriting and re-milestoning issues are the user's actions, proposed here and executed there.
