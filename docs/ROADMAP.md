# Roadmap

> Ledger of this project's milestones — a human-readable index cross-referenced
> to GitHub Issues/Milestones, which are the actual source of truth for
> per-issue progress. Model: **one milestone = one GitHub Milestone = N GitHub
> issues = N PRs** (one issue = one PR = one squash commit).
>
> Two ways to add a milestone:
> - **Fast path**: `/milestone <template-name>` instantiates a reusable
>   blueprint from `docs/milestone-templates/*.md` — fills placeholders, seeds
>   the GitHub Milestone + issues, and appends the resulting section here.
> - **Bespoke path**: hand-write a `## Milestone N` section below (same shape
>   a template would produce, minus the placeholders), then run
>   `/milestone <N>` to seed it.
>
> Either way, implement each seeded issue with `/pr <issue-number>` — never
> implement inline from this file.

## Status

| # | Milestone | Status |
|---|---|---|
| 1 | \<milestone name> | 🔲 planned |

<!-- Legend: 🔲 planned (not yet seeded) · 🟡 seeded (issues open on GitHub) · 🟢 done (GitHub Milestone closed) -->

## Milestone 1 — \<name>

**Source:** \<template `<template-name>` | bespoke>
**GitHub Milestone:** \<#N once seeded — link>

| Sub-task | Issue |
|---|---|
| \<sub-task 1 title> | \<#issue once seeded> |

<!-- TEMPLATE: add more sub-tasks and more milestones as needed. Before seeding, a sub-task row only needs its title; /milestone fills in the Issue column. -->
