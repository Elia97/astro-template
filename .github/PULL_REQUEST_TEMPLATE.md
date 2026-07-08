<!-- PR title: Conventional, from the issue title (e.g. "refactor(config): switch trailingSlash to never"). -->

Closes #<!-- N -->

## What changes

<!-- 1-3 concise bullets. Detail lives in the diff and the commit. -->

-

## Definition of Done

<!-- Check only what's verified. [HARD] = blocking. -->

- [ ] **[HARD]** `pnpm run ci` (Biome + typecheck + unit tests) green
- [ ] **[HARD]** `pnpm run build` green
- [ ] **[HARD]** Vercel preview green
- [ ] **[HARD]** No secrets committed (diff checked)
- [ ] Docs updated if impacted (never `PROJECT.md`)
- [ ] Tests for the new logic (if applicable)
- [ ] Lighthouse mobile ≥ 95 (if it touches public-facing pages)

## Reviewer checks

<!-- Copy-paste-friendly: preview URLs to open, scenarios to test. -->

1.

## Notes

<!-- Decisions/alternatives discarded. Empty if straightforward. Merges in SQUASH → rolls into release-please's rolling release PR. -->
