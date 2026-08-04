# Open decisions

> Only **open** decisions, not a history — that lives in `git log`. Once a decision is resolved, remove it from here and reflect the outcome in the relevant docs (`ARCHITECTURE.md`, guides in `docs/guides/`).

Informational, not blocking: agents read this as context before starting a milestone, but it doesn't prevent starting.

Group open decisions under the milestone they gate; keep a trailing **Informativa (non bloccante)** bucket for things agents should know but that don't block any milestone.

Two markers, and only these two:

- **🔴** on what blocks the estimate or the implementation — everything else is ordinary open ground.
- **the day value**, wherever the answer moves the number (`D1 — what "full-custom" means: 6 days, across M2, M3, M6`). A question without a number is a curiosity; a question with one is a decision the client can actually take.

Only what **changes the code** belongs here. Commercial open points live in the estimate, not in this file.

<!-- TEMPLATE — replace the examples below with real open decisions.

## Milestone 2

### Email provider for the contact form
Resend vs Postmark — pending budget confirmation from the client. Blocks sub-task 2.x.

## Informativa (non bloccante)

### Evocative imagery for hero/sections
Abstract placeholder treatments for v1.0.0; real photography is a post-launch improvement.

-->
