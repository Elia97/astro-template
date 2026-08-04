# Proposal templates

Blueprints for the two documents that are written **before** a project is
approved, and that stay **out of version control** once written.

## Why they live here and not as `docs/ESTIMATE.md`

`.gitignore` excludes `docs/ESTIMATE.md`, `docs/MEETING-*.md` and `docs/*.pdf`
— the repo tracks what gets built, not what gets quoted. A scaffold shipped at
those paths would therefore be ignored and never reach a fork. Keeping the
blueprints under a tracked path is what makes them travel.

## Use

```sh
cp docs/proposal-templates/estimate.md docs/ESTIMATE.md
cp docs/proposal-templates/meeting.md  docs/MEETING-$(date +%F).md
```

Then render the PDF that actually gets sent:

```sh
md2pdf docs/ESTIMATE.md docs/Estimate-<project>-<date>.pdf
```

The blueprints are in English like the rest of this repo; the delivered
documents are written in the client's language.

## The pairing that must not drift

| Document | Tracked | Audience | Contains |
|---|:-:|---|---|
| `docs/ROADMAP.md` | ✅ | whoever implements | milestones, sub-tasks, **days** |
| `docs/ESTIMATE.md` | ❌ | whoever pays | the same days, argued |
| `docs/MEETING-<date>.md` | ❌ | **nobody but you** | what to ask, in what order |

`ESTIMATE.md` is **derived from** `ROADMAP.md`, never written before it. If the
two disagree on a number, the roadmap is right and the estimate is stale.

`MEETING-*.md` is internal by construction: it holds the figure to keep in your
pocket next to the one on the table. It is never shared, never attached, never
pasted into an email.

## What decides the form of the estimate

Two shapes, and the recipient decides which:

- **days only** — a client operating under a framework agreement where rates
  apply to days accrued over a period, not to this project. Putting a total in
  would mean guessing it, and would make the estimate incomparable with the
  others.
- **days and amount** — a direct client, who is buying a piece of work rather
  than a unit of valuation.

The blueprint carries both; delete the one that does not apply. Rates live
outside this repo.
