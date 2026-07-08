# Milestone templates

Reusable milestone blueprints — versioned, portable across every project forked
from this template. Same "stable, reusable" status `CLAUDE.md` already gives
`docs/guides/*.md`. Consumed by `/milestone <template-name>` (see
`.claude/commands/milestone.md`), which turns one of these into a native GitHub
Milestone plus one issue per sub-task.

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

## Available templates

- `content-section.md` — new content-collection-backed section (listing +
  detail pages + SEO), parametrized by section/collection/route name.
