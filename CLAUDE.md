Reusable Astro template (personal/freelance use). Rules under `[HARD]` are non-negotiable — don't work around them for convenience, even if they seem to block a task.

## Stack and conventions

- **Package manager**: pnpm via corepack only — version pinned in `packageManager` (`package.json`). No npm/yarn, no global installs. What actually stops `yarn` is corepack shimming it; **nothing stops `npm install`** — corepack does not shim npm, and npm ignores `package-manager-strict` in `.npmrc` ("Unknown project config"). Treat the npm ban as a convention to keep, not a guardrail that fires.
- **Node**: version pinned in `.nvmrc` — respect it, don't assume a different version.
- **Formatter/linter**: Biome only (`biome.json`) — no ESLint/Prettier. Style: 2 spaces, single quotes, no semicolons, trailing commas.
- **TypeScript**: `astro/tsconfigs/strictest`. If `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` flag an error, fix it in the code — don't relax the config to make it go away.
- **Rendering**: `output: "static"` — pages are prerendered by default. A page that needs per-request data opts out with `export const prerender = false` explicit in the frontmatter. The server comes from the adapter, not from this setting: actions and on-demand routes work either way.
- **Deploy**: Vercel, via `@astrojs/vercel`.
- **Reading the tree**: `docs/ARCHITECTURE.md` § Repository layout labels every path `machinery` / `config` / `chrome` / `seed` / `example`. Touch machinery to fix a defect, not to tidy; extend the `example` pattern rather than inventing a second one, and don't delete a `seed` path — the generators write into it.
- **Comments — the default is not to write one.** Good names, short functions and explicit types carry most of the code on their own, and every comment is one more thing that ages. You comment in the **particular cases**, which are these and no others:
  - a **vendor quirk** the code can't reveal (a 204 that means success, a field the API accepts and ignores);
  - an **invariant the language can't express**: a value that is a contract with something external, a mandatory call order, a coupling between two files the type system doesn't hold;
  - **why a chosen constant has that value**, when it isn't arbitrary (why 8 seconds and not 30, why that threshold);
  - a **workaround for an external bug**, with the link to the upstream issue;
  - a **silent trap**, where getting it wrong raises no error and just behaves wrong (security, GDPR, SEO).
  - **That list is closed.** It doesn't extend by analogy: "explaining the design choice", "helping whoever reads next", "saying why this value/class/order" are not entries in it — a reason that the code already shows is not a fact worth a line.
  - **The test, applied to every comment you write**: does it carry a fact you could go and check **somewhere other than this file** — vendor docs, a measured number, a browser's behaviour, a named line in another module? If yes it stays; if no it goes, however well written it is.
  - **An API behaving as documented is not a quirk.** `querySelectorAll` matching descendants, `cloneNode(true)` copying children: that's documented semantics — the reader knows it or looks it up in a minute. A quirk is the platform doing the **opposite** of what the docs or common sense promise: Safari refusing `play()` on a non-muted video, Firefox not exposing `wheelDeltaY`, a `focus()` that scrolls its container.
  - **If you're explaining what an identifier is, the name is missing.** "How far the titles sink below the orb" above `SINK_VH` doesn't say why 0.12 — it translates the name, and the fix is to rename (`TITLES_SINK_BELOW_ORB_VH`), not to comment. "Why a chosen constant has that value" means **where the number comes from** — measured, imposed by a spec, derived from another measure — not what it stands for.
  - **If a test already holds the constraint, the comment is prose restating a test.** One of the two runs and fails when the code moves; the other doesn't. Write the test, and at most point at its file instead of summarising it.
  - **Anything provisional is a `TODO`**, not a caption: "until the client sends the 9:16 cut" is a pending commitment — mark it, or the first cleanup sweeps it away along with the prose around it. A `TODO` says **what to do and where**, otherwise it's noise wearing a label.
  - **A comment is not a substitute for shared code.** If it says "keep this the same as that" — same typography as the other card, same value as the other constant — that constraint belongs in the code: a shared component, an imported constant, a token, at worst a test that fails when the two drift. In prose it binds nobody, nothing runs it, and the day the copies diverge it sits there stating something false. If you can't centralise it right now, what you have is a **`TODO`** naming the duplication and where it lives, not a caption describing it and leaving it there. A coupling is worth stating as a fact only when it's **unavoidable** (an attribute another module reads, a value that must match an external config), and it gets named precisely — file and symbol, not "same as the other page".
  - **Predictions about our own code are not facts.** "If these two diverge the front splits", "without this the layout breaks", "inverted, the text would touch the edges": they sound like invariants, but they're inferences any reader draws from the code, and they rot the moment the code moves. The giveaway is the conditional — *would break, would overflow, would be unreadable*. A fact is in the present and comes from outside.
  - **Form**: present tense, about the code **as it is now**. A comment is a caption of the current state, not a record of how it got there.
  - **Never**: narrate the change ("used to be X", "now instead", "no longer", "removed in #NN", "replaces Y") · restate what the code does · repeat the commit message · banners and dividers · JSDoc on already-readable signatures · comment a test instead of naming it so it explains itself.
  - **Always kept**, because removing them changes behaviour: `biome-ignore`, `@ts-*`, `/// <reference …>`, `@vitest-environment`, `@public` (fallow), `TODO`/`FIXME`, `[HARD]` markers, shebangs.
  - **One line, two at the very most** — and that's a ceiling, not a target. More than that isn't a comment but documentation: it belongs in `docs/` (with the code pointing at it), or the code needs to get clearer. A long block is almost always one fact wrapped in three sentences that restate the code: keep the fact, drop the rest.
  - Applies everywhere, **tests, config files and workflows included** — that's where the drift goes unnoticed.
  - History lives in `git log` and `docs/DECISIONS.md`, and that's where it gets looked up: `git log -S`, `git blame`.
  - **Before handing off, sweep your own diff** and delete the comments that don't pass the test — including the ones a vertical agent wrote for you. This pass is not optional: writing one comment fewer costs nothing, leaving one in costs every reader after you.
  - Before the gates: `pnpm run check:comments` sweeps **the whole tree**, tracked plus untracked — because yesterday's debt counts as much as today's; `--diff [base]` narrows it to the current branch, which is the per-PR scope. It lists blocks over two lines, past-tense narration and files where comments run over 15% of the lines. It reads **shape, not usefulness** — a short, useless, present-tense comment sails through it clean. A green run is not permission to keep it.

## Workflow [HARD]

- Commits: Conventional Commits, validated by commitlint on lefthook's `commit-msg` hook (`type(scope): subject`). A commit that doesn't match the format is rejected by the hook — don't bypass it with `--no-verify`.
- **Anything that must reach production needs a releasable type** — release-please bumps the version on `feat`/`fix` only, and production ships from a release tag. A change landed as `chore`/`docs` stays on `main` unpublished; that is also why dependabot's npm bumps land as `fix(deps)` (`.github/dependabot.yml`), so a merged security patch cuts a tag on its own. Content edits are therefore `fix(content): …`. On a PR this is the **title** that matters, not the commits: squash-merge makes the title the commit message.
- One GitHub issue = one PR = one squash commit on `main`: branch `<type>/<N>-<slug>`, Conventional PR title, `Closes #N` in the body — and the body always via `--body-file` from `.claude/plans/pr-<N>-<slug>.body.md` (gitignored), structured on `.github/PULL_REQUEST_TEMPLATE.md`. Never force-push, and never commit, push or open a PR without the user's explicit go.
- Before considering a task done, run `pnpm run ci` (Biome + type-check + unit tests, doesn't modify files) — it must pass clean.
- The `pre-commit` hook auto-formats staged files with Biome: it's normal for files to be rewritten at commit time, that's not an error.
- `docs/PROJECT.md` is the client's brief in their own words — never modify it arbitrarily; update it only with explicit new client input.

## Planning and vertical agents

- Work is planned in `docs/ROADMAP.md` (a ledger of milestones and their sub-tasks, cross-referenced to GitHub issues, carrying the day estimate per milestone) and `docs/DECISIONS.md` (open decisions, informational — doesn't block seeding a milestone).
- **Before the plan comes the estimate.** `docs/ESTIMATE.md` and `docs/MEETING-*.md` are **untracked by design** (`.gitignore`) and **derived from `docs/ROADMAP.md`**, never written before it: if the two disagree on a number, the roadmap is right. Blueprints in `docs/proposal-templates/`. The client's own material stays tracked under `docs/sources/`.
- **[HARD] No issue exists before the work is approved.** `/milestone` previews every issue in plan mode — on a plan the client hasn't signed off, that preview *is* the deliverable. After approval, seed one milestone at a time: a seeded milestone is a frozen plan, and the distant ones still move.
- **Seeding**: `/milestone <template-name>|<N>` turns a `docs/milestone-templates/*.md` template (or a hand-written `docs/ROADMAP.md` section) into a native GitHub Milestone plus one GitHub issue per sub-task — plan mode previews every issue before creation, one approval creates the whole batch. It never writes application code, never branches, never commits.
- **Deciding the approach**: `/approach` runs between seeding and implementation, over a whole milestone — it checks what the issues claim against what the code says today, finds the dependencies and overlaps between them, settles the order with you, and writes the outcome to `.claude/plans/`. Read-only: never branches, never edits code, never commits.
- **Implementation**: `/pr <issue-number>` implements a single GitHub issue end-to-end (branch → vertical agents → quality gates → PR body with `Closes #N`) — one issue = one PR = one squash commit. It reads the `/approach` brief for that issue when one exists. Never commits/pushes/opens a PR on its own.
- Available vertical agents (`.claude/agents/`), one per domain: `content-agent`, `ui-agent`, `seo-agent`, `forms-agent`, `perf-rendering-agent`, `ops-agent`, plus `comments-agent` — cross-cutting, not a domain: `/pr` runs it over the diff before the gate, and it can audit the whole tree on demand. Both `/milestone` (suggesting an agent per issue) and `/pr` (implementing one) use the same domain-detection logic. Each agent reads the matching guide in `docs/guides/*.md` when one exists, and falls back to standard best practices when it doesn't. Role (implement/review) is decided at invocation-prompt level, not by separate agent files.
- Reusable milestone blueprints live in `docs/milestone-templates/*.md` — same "stable, reusable across projects" status as `docs/guides/*.md`.

## Language [HARD]

Two categories, and the split is what a file is for — not a style preference.

| | Language | Files |
|---|:-:|---|
| **Stable**, travels between projects | **English** | `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/guides/*`, `docs/milestone-templates/*`, `docs/proposal-templates/*`, `.claude/commands/*`, `.claude/agents/*`, comments in `src/**` |
| **Living**, this project only | the project's own | `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/PROJECT.md`, `.claude/plans/*`, GitHub issues and PR bodies |

`pnpm run check:language` (in `pnpm run ci`) enforces the first row and never
looks at the second: a stable file reading as Italian fails the gate. It judges
by function-word frequency, so a file too short to carry the signal — an index,
a source file with no comments — is left undecided rather than guessed at.

Why it exists: the two halves of a codebase family cannot be diffed against each
other once they drift apart in language, and a rule nobody can check is a rule
that decays. The living documents are excluded deliberately — they get written
and rewritten in the language the work happens in, and pretending otherwise just
moves the drift somewhere no gate looks.

## Multi-agent workflows [HARD]

Containment rules for multi-agent orchestration (Workflow tool, agent fan-outs). They cap every session-level mode, ultracode included — a session mode never authorizes spend beyond these tiers.

- **Proportionality, measured first.** Before any orchestration, size the surface (`git diff --stat` for a review, an equivalent scope estimate otherwise):
  - **Small** (< ~150 changed lines): no workflow and no multi-agent review — `pnpm run ci` + `pnpm run build` are the gate.
  - **Medium** (~150–400 lines): at most **one** reviewer agent, no fan-out.
  - **Large** (> ~400 lines), or a medium diff touching a risk area (`src/actions/**`, `src/emails/**`, `src/middleware.ts`, `vercel.json`, env or deploy config): a compact workflow is allowed within the caps below.
- **Hard caps**: ≤ 6 agents per workflow, 1 verifier per finding — no multi-vote panels. Exceeding a cap means asking first, with a cost estimate.
- **Announce, then account**: state how many agents and what each does before launching; report the actual count and the token spend after.
- `/pr` never auto-appends a review workflow: only the tiers above, or the user asking for one in that session, unlock it.

## Development

Dev server: `astro dev --background`, managed with `astro dev stop` / `astro dev status` / `astro dev logs`.

## Documentation

Astro docs: https://docs.astro.build — consult them before touching routing/middleware, components, framework islands, content collections, Tailwind styling or i18n.
