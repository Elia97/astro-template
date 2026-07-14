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
| Action | `src/actions/index.ts` | orchestration, rate limit, error policy |
| Vendor | `src/lib/vendor/brevo.ts` | HTTP client, result-as-value, key handling (shared) |
| Email | `src/emails/contact.ts` | HTML rendering, escaping, copy |
| UI | `src/components/contact/*.astro` | markup, i18n keys, a11y |
| Behavior | `contact-form-behavior.ts` | FormData → typed payload (`buildPayload`) |
| Binder | `src/components/forms/action-submit.ts` | submit lifecycle, feedback, multi-instance binding (shared) |

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
- Field-level zod errors surface via `isInputError` (first message wins);
  everything else falls back to the generic error copy.
- The submit path requires JS (Astro Actions call): there's no `action=`
  fallback. The action still enforces everything server-side, so a custom
  no-JS fallback can be added without changing the contract.

## Extending

### New field on the contact form

1. Add it to `contactSchema` (limits included).
2. Render it in the right `contact-*.astro` component (+ i18n keys).
3. Pick it up in `buildPayload` (`contact-form-behavior.ts`).
4. Show it in the notification email (`detailRow` in `emails/contact.ts`).
5. Persist it if useful (`contactAttributes` → CRM columns).

### A whole new action-backed form

1. **Schema** in its own `src/lib/<name>.ts` (zod, shared client/server).
2. **Action** in `src/actions/index.ts`: `defineAction({ accept: 'json', input,
   handler })`; rate-limit under its **own scope prefix**; pick the error policy
   by shape — one fatal call → fail-loud on its result; fan-out → fail-loud only
   on the call that would lose data.
3. **Vendor**: reuse a `src/lib/vendor/brevo.ts` function (result-as-value) or
   add a sibling vendor module, keeping the missing-config dev-no-op /
   prod-refuse policy (api key and optional ids alike).
4. **UI** `src/components/<name>/*.astro`: the `data-*` presentational contract —
   the form marker, `data-i18n-*` labels, and `[data-form-success|error]`
   paragraphs.
5. **Behavior** `src/components/<name>/<name>-form-behavior.ts`: one
   `createActionFormBinding({ formSelector, buildPayload, submit })` — reuse the
   shared binder, don't re-implement the submit lifecycle.
