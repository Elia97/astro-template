<!-- BLUEPRINT — copy to docs/ESTIMATE.md (gitignored) and fill in. See README.md in this
folder for the two possible forms. Delete every one of these comments as you go. -->

# Day estimate — \<CLIENT\> · \<what is being built\>

**For:** \<who receives it\> · **From:** \<who signs it\> · **Date:** \<DD/MM/YYYY\> · **v\<N\>**

> Estimate of the days required for the work described in `docs/ROADMAP.md`. **Not a signed
> offer.** **Scope: software development only** — writing, integrating and testing code.

<!-- If a framework agreement governs the relationship, cite the clause that asks for a day
estimate right here: it is what makes the document an obligation being met rather than a
proposal being pushed. -->

| | **days** |
| :-- | :-: |
| **Phase 1 — \<name\>** | **\<n\>** |
| Phase 2 — \<name\> | \<n\> |
| **DEVELOPMENT TOTAL** | **\<n\>** |

> ⚠️ **How the number is derived.** Two rules: a **system** milestone is worth **one day**;
> **front-end** counts **half a day per page**. Hence: \<a\> system days + \<b\> pages × 0.5 =
> **\<total\>**.
>
> ⚠️ **Not a deadline, and it is minimum effort.** These are units of valuation, not a headcount
> of hours and not a calendar. Where a milestone takes more than its day, the difference is
> accrued work, not a change request.
>
> ⚠️ **The days start when the inputs exist.** Analysis, design, copy and translations sit
> upstream of this work and are not in this number. The go-live date is the sum of two chains and
> this document governs one of them.

<!-- DAYS-ONLY FORM — keep this paragraph, adapted, when rates apply to days accrued over a
period rather than to this project:

> ⚠️ **Why there is no amount.** What gets approved is the estimate; the rate applies later to
> the days accrued, a count that belongs to the client and not to this project. The same days are
> worth different amounts depending on when they accrue: putting a total here would mean guessing
> it, and would make this estimate incomparable with the others. **Days compare, amounts do not.**

DAYS-AND-AMOUNT FORM — replace it with a rate line and an amount, net of VAT, and add the
amount column to the summary table above. -->

<!-- OPTIONAL — only when an unresolved decision changes the total. Say plainly whether the
variables are independent: two that compound must not be presented as if they added up. -->

| Scenario | | days |
| :-- | :-- | :-: |
| **\<A\>** | \<what it means in one line\> | **\<n\>** |
| **\<B\>** | \<what it means in one line\> | **\<n\>** |

---

## 1. Basis of calculation

| | |
| --- | --- |
| **Unit of estimate** | the **day** |
| Definition of a day | a conventional unit of valuation, not a count of hours |
| Calibration | **minimum effort**, with strong assisted-development leverage: no snags, no rework, no contingency |
| Granularity | system: **1 day per milestone** · front-end: **0.5 days per page** |
| Operational detail | `docs/ROADMAP.md` — \<n\> milestones, \<m\> sub-tasks with checklists |

## 2. Out of scope

<!-- Name the exclusions explicitly, including the ones nobody asked about: they are the items
that invite themselves in later, and declaring them now costs nothing. -->

Functional analysis · UI/UX design and design system · copy and translations · client training ·
content population · recurring costs for hosting, database, email and domain · maintenance and
support after go-live.

## 3. Cost per milestone

<!-- Mirrors docs/ROADMAP.md one row per milestone. If the two ever disagree, the roadmap wins. -->

| # | Milestone | Nature | days |
| --- | --- | :-- | :-: |
| 1 | Foundations | system | 1 |
| | **PHASE 1 — \<name\>** | | **\<n\>** |
| | **TOTAL** | | **\<n\>** |

### The \<n\> front-end pages

Half a day each. These are **templates, not content**: pages sharing a layout count once.

<!-- List them. Then keep this sentence — it is the cheapest concession in the document and it
prevents the argument later. -->

If the final sitemap adds or removes pages, the total moves by **half a day per page**.

## 4. Open variables

<!-- One block per unresolved decision that changes the number, each with its day delta and the
milestones it lands on. A variable without a number is a curiosity; one with a number is a
decision the client can actually take.

Where the work is of the kind where "plausible" and "correct" look alike — concurrency, money,
tax, idempotent webhooks — say so here, in the document. Assisted development compresses the
writing, not the verification, and that is exactly where a zero-contingency floor is least
credible. Saying it up front is a qualified circumstance; saying it later is an excuse. -->
