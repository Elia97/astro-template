# Roadmap

> Ledger of this project's milestones — a human-readable index cross-referenced
> to GitHub Issues/Milestones, which are the actual source of truth for
> per-issue progress. Model: **one milestone = one GitHub Milestone = N GitHub
> issues = N PRs** (one issue = one PR = one squash commit).
>
> Two ways to add a milestone:
> - **Bespoke path**: write a `## Milestone N` section below, then `/milestone <N>`
>   seeds it. This is the path for everything planned up front — including
>   Milestone 1, transcribed from `docs/milestone-templates/foundations.md`.
> - **Fast path**: `/milestone <template-name>` instantiates a blueprint from
>   `docs/milestone-templates/*.md` and **appends** it as the next milestone
>   number. For blueprints reached for mid-project, not for sections already
>   written here — against an existing section it would create a duplicate one
>   number higher.
>
> Either way, implement each seeded issue with `/pr <issue-number>` — never
> implement inline from this file.
>
> **Two estimation rules**: a **system** milestone is worth **one day**;
> **front-end** counts **half a day per page**. Both are **minimum effort** —
> the days actually accrued are consolidated at the end of the period. Estimate
> per milestone, never per sub-task: summing sub-task guesses buys apparent
> precision and costs real accuracy. `docs/ESTIMATE.md` (untracked) is derived
> from the `days` column below and is never written before it.

## Status

| # | Milestone | Phase | days | Status |
|---|---|:-:|:-:|---|
| 1 | \<milestone name> | 1 | \<n> | 🔲 planned |
| | **TOTAL** | | **\<n>** | |

<!-- Legend: 🔲 planned (not yet seeded) · 🟡 seeded (issues open on GitHub) · 🟢 done (GitHub Milestone closed) -->

## Dependencies

<!-- Which milestone cannot start before which, and why. It is what makes the phasing defensible
when the client asks to bring something forward — and what stops a milestone being seeded on top
of a decision that has not been taken yet. Drop this section on a project small enough that the
order is obvious. -->

```text
1 (foundations)
 └→ …
```

## Milestone 1 — \<name>

**Source:** \<template `<template-name>` | bespoke>
**GitHub Milestone:** \<#N once seeded — link>
**Phase \<n>** · **\<n> days**

<!-- 1-3 sentences: what exists at the end of this milestone that did not exist before. Written
as a state of the world, not as a list of activities. -->

| Sub-task | Issue |
|---|---|
| \<sub-task 1 title> | \<#issue once seeded> |

<!-- TEMPLATE: add more sub-tasks and more milestones as needed. Before seeding, a sub-task row only needs its title; /milestone fills in the Issue column. -->
