# Milestone templates

Reusable milestone blueprints, consumed by `/milestone <template-name>`
(`.claude/commands/milestone.md`).

## File format

Front-matter (YAML, minimal on purpose):

```yaml
---
name: "<milestone name, may contain {{placeholder}} tokens>"
description: <one-line summary>
---
```

No separate `placeholders` list — `/milestone` scans the body for distinct
`{{snake_case}}` tokens and asks about each one directly (one batched
`AskUserQuestion` call), using the surrounding text as context. Declaring
placeholders twice would just be a second place for them to drift out of sync.

Body:

- One `# <name>` heading, 1-3 sentences: what this milestone delivers, when to
  reach for it.
- A `## Sub-tasks` section, one block per sub-task:

  ```markdown
  ### <N>. <Conventional-Commit-shaped title, e.g. "feat(content): add {{x}}">

  **Agent:** <content-agent | ui-agent | seo-agent | forms-agent | perf-rendering-agent | ops-agent | general-purpose>
  **Labels:** <a GitHub label, or leave empty>

  <1-3 sentences of scope/context — becomes the issue body's prose.>

  Checklist:
  - [ ] ...
  ```

Parsing contract `/milestone` relies on:
- The ordinal `<N>. ` prefix is stripped; the rest of the heading becomes the
  literal GitHub issue title, verbatim, after placeholder substitution.
- `**Agent:**` / `**Labels:**` are recognized by exact line prefix. Labels may
  be empty (skip `--label` entirely).
- Everything else in the block (prose + checklist) becomes the issue body,
  prefixed with two HTML comments (invisible in GitHub's rendered view, read
  by `/pr`):
  ```
  <!-- milestone-template: <this-file's-slug> -->
  <!-- suggested-agent: <same value as **Agent:** above> -->
  ```
  This is how `/pr` reuses `/milestone`'s agent-selection logic without
  duplicating code — slash commands can't import each other, so the
  suggestion travels inside the issue body instead.

## What NOT to do

- Never invent a GitHub label purely to group a milestone's issues — the
  native GitHub Milestone object is the grouping mechanism. `**Labels:**` is
  only for ordinary GitHub labels (enhancement, bug, ...), never for grouping.
- Don't over-fragment into one-line sub-tasks — each becomes its own issue and
  PR; keep the grain at "coherent, reviewable unit of work."

## Which path seeds which

`/milestone <template-name>` **appends a milestone that is not in the roadmap
yet** — it numbers it `1 + the highest ## Milestone N heading present`. So it
fits a blueprint reached for mid-project, not one already written into the plan.

`/milestone <N>` seeds a `## Milestone N` section **that already exists**. That
is the path for everything planned up front, `foundations` included: running the
template path against a roadmap that already carries the section would create a
duplicate one number higher.

## Available templates

- `foundations.md` — Milestone 1 of every project: branding, environments,
  design system, SEO, forms, consent, real content. Transcribed into the roadmap
  while the plan is written (the estimate is derived from it), then seeded with
  `/milestone 1`. Nothing else can be built on a scaffold that still calls
  itself `astro-template`.
- `content-section.md` — new content-collection-backed section (listing +
  detail pages + SEO), parametrized by section/collection/route name.
