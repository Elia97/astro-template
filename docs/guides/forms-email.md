# Forms

Conventions established by the action-backed form stack — the contact form is
the reference. Cross-ref: `ui-components.md` (Field/Select primitives), `seo.md`
(page-level meta).

The same layering carries any number of action-backed forms on **one shared
vendor client** and **one shared submit binder**: add a form by reusing both,
never by reinventing the submit lifecycle or the vendor transport.

## Layered architecture (one concern per module)

| Layer | File | Owns |
|---|---|---|
| Schema | `src/lib/contact.ts` | zod contract, shared client/server |
| Action | `src/actions/index.ts` | orchestration, abuse guards, error policy |
| Vendor | `src/lib/vendor/brevo.ts` | HTTP client, result-as-value, key handling (shared) |
| Email | `src/emails/contact.ts` | HTML rendering, escaping, copy |
| UI | `src/components/contact/*.astro` | markup, i18n keys, a11y |
| Behavior | `contact-form-behavior.ts` | FormData → typed payload (`buildPayload`) |
| Binder | `src/components/forms/action-submit.ts` | submit lifecycle, feedback, multi-instance binding (shared) |
| Field errors | `src/components/forms/field-errors.ts` | per-field error slots, `aria-invalid`, focus (shared) |
| Honeypot | `src/lib/forms/honeypot.ts` + `honeypot-schema.ts` | decoy field name and predicate / its zod shape (shared) |

Layers talk through narrow interfaces: `ContactPayload` derives from the
action (`Parameters<typeof actions.contact>[0]`), so a schema change
propagates to the client at typecheck time.

## Validation

- One zod schema (`contactSchema`) is the single contract — the action
  validates it server-side regardless of any client-side `required`.
- GDPR consent is `z.literal(true)`: an explicit checkbox, never pre-checked,
  with the privacy link inside the label
  (`contact-consent-field.astro`).
- Field limits mirror the UI's `maxlength` — keep both in sync.
- Every action schema spreads `honeypotShape` (see Abuse protection): the decoy
  is part of the contract, not something the handler reads off the raw body.

**[HARD] Every message comes from the dictionary.** Zod's own errors are English
("Invalid email") and they reach the user verbatim — `applyFieldErrors()` prints
them straight into the field slots. Build fields from
`src/lib/forms/form-fields.ts` (`requiredText`, `emailField`, `consentField`),
which carry `error:` messages resolved through `useTranslations()`;
`form-fields.test.ts` holds each one to the dictionary so a field can't quietly
fall back to the default.

The schema is module-level, outside any request, so messages resolve at the
**default locale**. A second language means building the schema inside the action
handler, where `Astro.currentLocale` is known.

**[HARD] `required` in the markup means required in the schema.** The form is
`novalidate` — the browser's bubbles would otherwise report the first invalid
field in its own wording and styling, ahead of the schema, without setting
`aria-invalid` or filling a slot. That makes the schema the only gate that runs:
a field marked `required` but defaulted to `''` accepts an empty submit from
anything that isn't a browser. `form-fields.test.ts` pins that parity per field.

## Error policy (fail-loud where it matters)

Pick the policy from the action's **shape**:

- **Fan-out** (several vendor calls, some best-effort): fail-loud **only** on the
  call that would lose the data. In contact, the **owner notification** failing =
  the lead is lost → `ActionError` (surfaces as the form's error state); autoreply
  and CRM upsert are best-effort, logged (`console.error`), never user-facing.
- **Single-call**: the action's one response *is* the outcome — nothing to keep
  best-effort. Invert the policy and fail-loud outright: a non-`ok` result →
  `ActionError`, no swallowing.
- Rate limiting: `rateLimit('contact:' + clientAddress)` — in-memory sliding
  window (5/60s), per-instance. Each form gets its **own scope prefix**
  (`'<name>:' + clientAddress`) so the windows stay independent. It resets on
  cold starts and isn't shared across serverless instances: a base anti-abuse
  layer, not a hard quota. Upgrade path for a real quota: a store shared across
  instances (e.g. a hosted key-value service).

## Abuse protection

The action is public and unauthenticated, so the guards are layered in the
handler **cheapest-first** — the one that costs a network call only runs for a
submission that already looks human:

1. **Honeypot** — `HONEYPOT_FIELD` (`website`) in `src/lib/forms/honeypot.ts`. The
   schema *accepts* a filled decoy instead of rejecting it: a validation error
   would tell the bot which field gave it away. Filled → `console.warn` +
   `{ ok: true }`, no vendor call. One name shared by the schema shape
   (`honeypotShape`), the hidden input
   (`src/components/forms/honeypot-field.astro` — `sr-only`, `aria-hidden`,
   `tabindex="-1"`, `autocomplete="off"`) and every `buildPayload`: import the
   constant, never retype the string.
2. **Rate limit** — the in-memory window above.
3. **Bot check** — Vercel BotID Basic (free on every plan, invisible, no visible
   challenge). Three pieces that must stay in sync: the `vercel.json` rewrites
   (same-origin proxy for the challenge script — that's what keeps ad-blockers
   and the CSP out of the way, which is why enabling it needed no `script-src`
   entry; guarded by `src/vercel-botid.test.ts`), `initFormBotId()`
   (`src/components/forms/botid.ts`) declaring `/_actions/contact`, and
   `checkBotId()` in the handler. **A path missing from the client list always
   reads as a bot server-side.**

Policy worth keeping in a fork:

- **`honeypot.ts` and `honeypot-schema.ts` stay two modules.** The form behavior
  imports the constant client-side, and a module-level `z.…()` call isn't
  tree-shakeable: merging them ships all of Zod (~12 KB gz) to every page with a
  form. `pnpm perf:bundle` fails on it — measured, `/contatti` goes 9.8 → 22.1 KB.
- **Both halves of BotID are gated on `import.meta.env.PROD`**: the challenge
  script is served by a `vercel.json` rewrite that `astro dev` never reads, so
  initializing locally would leave every action POST waiting on a 404.
- **Init where the form is, not in the layout.** `initFormBotId()` runs from
  `contact-form.astro`'s own script so only a route that can submit pays for the
  challenge client (+2.1 KB gz on `/contatti`, nothing elsewhere). A sitewide
  form — a footer newsletter — is the case for moving it to the layout instead.
- **Two failure modes, both biased toward the lead.** `checkBotId()` throwing →
  fail-open (log + proceed): a guard that breaks must never cost a lead. A bot
  verdict → whatever `BOTID_ENFORCE` says: unset/false **observes** (verdict
  logged, submission proceeds), true **rejects** with an `ActionError` instead of
  faking success, so the user keeps the phone/email fallback in play. Note this
  is the opposite of the honeypot, whose whole value is silence — there the
  sender is certainly a bot, here it may be a person.
- **Observe first, enforce after.** The flag ships `false` on purpose: a false
  positive is invisible — a lead that simply never arrives — so enforcement
  waits until a real browser submit has been seen passing on a deploy. Promotion
  path, no code change: watch the function logs for `bot detected — observe mode`
  on submissions you know are human; when they stay clean, set
  `BOTID_ENFORCE=true` (Plain, **never** Sensitive) in the deploy provider and
  redeploy. The classification runs either way — the flag only decides the
  consequence.
- BotID reads the request off Vercel's request context; there is nothing to pass
  it by hand.
- Escalation without code changes: **Deep Analysis** from the Vercel dashboard
  (Firewall → Rules; Pro, paid per `checkBotId()` call). Still open in the
  template: a durable rate limit — the in-memory window is the only per-IP quota.

## Email vendor contract

- `BrevoResult = { ok: true } | { ok: false, error }` — failure is a **value**,
  not a throw; only the action decides what's fatal.
- Missing `BREVO_API_KEY`: **dev no-ops loudly** (console.warn, form
  "succeeds"), **production refuses** (an explicit error instead of a
  silently dropped lead). Keep this behavior for any replacement vendor.
- **Optional integration ids follow the same policy as the key.** An optional
  config value (a list id, a template id) left unset → dev no-ops loudly
  (`console.warn`, form "succeeds", result `{ ok: true, skipped: true }`),
  **production refuses** (explicit error). This lets you ship a **gated** feature —
  merged and wired, dormant until the real credentials exist — with no risk of a
  silently dropped submission in prod.
- Sender/recipient come from env (`CONTACT_FROM_EMAIL`, `CONTACT_FROM_NAME`,
  `CONTACT_TO_EMAIL` — schema in astro.config.mjs, list in `.env.example`).
  Verify the sender domain's DKIM/SPF/DMARC before go-live.

## Email rendering

- Plain HTML strings: table layout + inline styles (email clients ignore
  stylesheets). Neutral gray palette — restyle per fork if needed.
- **Every** user-provided value goes through `escapeHtml` before
  interpolation. `detailRow(label, value)` skips empty values.
- Copy is in the site's default language; the subject carries `SITE.name`.

## Form UI conventions

- The submit lifecycle lives **once** in the shared binder
  (`createActionFormBinding({ formSelector, buildPayload, submit })`,
  `src/components/forms/action-submit.ts`): a per-form module supplies only a
  `formSelector`, a `buildPayload`, and the action. The binder disables the
  button and swaps its label while pending (`data-i18n-sending`/`data-i18n-submit`
  on the form — behavior modules ship no strings), toggles the
  `[data-form-success]`/`[data-form-error]` paragraphs
  (`role="status"`/`role="alert"`), and calls `form.reset()` on success. Never
  re-implement this per form.
- **Multi-instance by default**: the binder targets **every** matching form via
  `querySelectorAll` and stays idempotent across view transitions. When the same
  form renders more than once on a page, pass an `idPrefix` prop to namespace the
  label/aria ids so the instances don't collide — the `name` attributes stay
  identical (they scope per `<form>`).
- Fields compose the `Field` primitives with **visible labels** (the
  accessible default — a fork can go `sr-only` + placeholder as a look).
- The submit path requires JS (Astro Actions call): there's no `action=`
  fallback. The action still enforces everything server-side, so a custom
  no-JS fallback can be added without changing the contract.

### Validation surface

A zod error arrives as `error.fields`, keyed by schema field. It lands on the
field, not in one summary line:

- Each control sits beside a `<FieldError field="<schema key>" />` and points at
  it with a **static** `aria-describedby` (`fieldErrorId()` builds the id at both
  ends, so they can't drift). The slot renders empty — an empty element
  contributes no description, so the reference is inert until there's a message.
- `applyFieldErrors` writes the first message per field and flips `aria-invalid`;
  `focusFirstInvalid` then moves focus to the first invalid control **in DOM
  order**, not in `error.fields` key order, which would send focus backwards past
  a field the user hasn't reached.
- The `[data-form-error]` alert speaks **only** for messages with no slot to land
  in. Repeating there what a field already carries would have a screen reader
  announce it twice.
- The slot uses `empty:sr-only`, never `hidden`/`display:none`: hidden that way
  it leaves the accessibility tree and the `aria-describedby` dangles.
- Honeypot errors are dropped, never rendered — a slot would tell a bot which
  field it is.
- `markup-contract.test.ts` guards the pairing. Nothing about it is checked at
  compile time (`field` is a plain string), so a renamed or missing slot would
  only degrade at runtime, silently, into a form-level message. The test renders
  the fields through the Container API and compares the slots against the
  schema's keys — **rendered, not grepped**: the names exist for real only once
  the components have run, and a dangling `aria-describedby` is invisible in the
  source.

## Testing the actions

The orchestration is where a regression stays silent — every dependency can be
green while the guard order or the error policy is inverted — so it's covered in
`src/actions/{contact,guards}.test.ts`, one file per area (Biome caps files at
200 lines). Shared fixtures and the vendor/BotID mocks live in
`test/helpers/actions.ts`.

- **Handlers are exported by name** (`handleContact`) and passed to
  `defineAction`, so the tests drive the real orchestration without the action
  wrapper. `ActionContext` narrows what they read off the context to
  `clientAddress` alone; keep any new action to that shape rather than reaching
  for Astro's `ActionAPIContext`.
- **Vendor mocked, not fetch**: `vi.mock('@/lib/vendor/brevo', …)` returns
  `BrevoResult`s directly, keyed on the email `tags` so the tests don't pin the
  `Promise.all` order.
- **Env is driven through the stubs**: `test/stubs/astro-env-server.ts` mirrors
  astro.config.mjs's schema off `process.env`, read at import — hence
  `stubEnv` → `resetModules` → re-import, wrapped in `importActions()`.
  `vi.stubEnv('PROD', true)` reaches `import.meta.env.PROD` inside the imported
  module, which is what makes the production-only branches testable. The
  re-import also hands each test a clean rate-limit window (the sliding window is
  module-level state).
- **`test/stubs/astro-actions.ts`** carries `isInputError` (verbatim from Astro,
  for the client binder) plus a mirrored `ActionError` and an identity
  `defineAction`. Since `resetModules` re-instantiates that stub, the thrown
  class is never the one a test file imported: assert on `type`/`code`, never
  `instanceof` (`rejectionOf` in the helper does exactly that).
- **What the tests pin down**, i.e. what to re-check before touching the handler:
  fail-loud only on the owner notification, autoreply and CRM upsert logged and
  swallowed; `TOO_MANY_REQUESTS` on the sixth submission with independent windows
  per address; the honeypot short-circuit running before the rate limit; BotID
  off outside PROD, observe-by-default, `FORBIDDEN` when enforcing, fail-open
  when it throws.

## Extending

### New field on the contact form

1. Add it to `contactSchema` (limits included).
2. Render it in the right `contact-*.astro` component (+ i18n keys), with its
   `aria-describedby={fieldErrorId('<name>')}` and a sibling
   `<FieldError field="<name>" />` — `markup-contract.test.ts` fails without them.
3. Pick it up in `buildPayload` (`contact-form-behavior.ts`).
4. Show it in the notification email (`detailRow` in `emails/contact.ts`).
5. Persist it if useful (`contactAttributes` → CRM columns).
6. Extend the fixture in `test/helpers/actions.ts` — `ContactRequest` gained a
   key, so the action tests stop type-checking until it's there.

### A whole new action-backed form

1. **Schema** in its own `src/lib/<name>.ts` (zod, shared client/server),
   spreading `honeypotShape`.
2. **Action** in `src/actions/index.ts`: an exported `handle<Name>` handler
   passed to `defineAction({ accept: 'json', input, handler })`; run the guards
   in the same order (honeypot → rate limit under its **own scope prefix** →
   `assertNotBot`); pick the error policy by shape — one fatal call → fail-loud
   on its result; fan-out → fail-loud only on the call that would lose data.
   Register `/_actions/<name>` in `PROTECTED_ACTIONS`
   (`src/components/forms/botid.ts`), or the check reads every submit as a bot.
3. **Vendor**: reuse a `src/lib/vendor/brevo.ts` function (result-as-value) or
   add a sibling vendor module, keeping the missing-config dev-no-op /
   prod-refuse policy (api key and optional ids alike).
4. **UI** `src/components/<name>/*.astro`: the `data-*` presentational contract —
   the form marker, `data-i18n-*` labels, and `[data-form-success|error]`
   paragraphs — plus `<HoneypotField />` and one `<FieldError>` per schema key.
5. **Behavior** `src/components/<name>/<name>-form-behavior.ts`: one
   `createActionFormBinding({ formSelector, buildPayload, submit })` — reuse the
   shared binder, don't re-implement the submit lifecycle. `buildPayload` carries
   `HONEYPOT_FIELD` through.
6. **Tests**: a `markup-contract` case for the new form's slots, and
   `src/actions/<name>.test.ts` for its error policy — the guards are already
   covered once in `guards.test.ts` and don't need repeating per form.
