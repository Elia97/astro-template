# Forms

Conventions established by the contact-form stack. Cross-ref:
`ui-components.md` (Field/Select primitives), `seo.md` (page-level meta).

## Layered architecture (one concern per module)

| Layer | File | Owns |
|---|---|---|
| Schema | `src/lib/contact.ts` | zod contract, shared client/server |
| Action | `src/actions/index.ts` | orchestration, rate limit, error policy |
| Vendor | `src/lib/vendor/brevo.ts` | HTTP client, result-as-value, key handling |
| Email | `src/emails/contact.ts` | HTML rendering, escaping, copy |
| UI | `src/components/contact/*.astro` | markup, i18n keys, a11y |
| Behavior | `contact-form-behavior.ts` + `form-submit.ts` | FormData → payload → action, feedback |

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

- The **owner notification** failing = the lead would be lost → `ActionError`
  (surfaces as the form's error state).
- Autoreply and CRM upsert are **best-effort**: logged (`console.error`),
  never user-facing failures.
- Rate limiting: `rateLimit('contact:' + clientAddress)` — in-memory sliding
  window (5/60s), per-instance. It resets on cold starts and isn't shared
  across serverless instances: a base anti-abuse layer, not a hard quota.
  Upgrade path if a fork needs a real quota: a shared store (e.g. Upstash).

## Email vendor contract

- `BrevoResult = { ok: true } | { ok: false, error }` — failure is a value;
  only the action decides what's fatal.
- Missing `BREVO_API_KEY`: **dev no-ops loudly** (console.warn, form
  "succeeds"), **production refuses** (an explicit error instead of a
  silently dropped lead). Keep this behavior for any replacement vendor.
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

- Fields compose the `Field` primitives with **visible labels** (the
  accessible default — a fork can go `sr-only` + placeholder as a look).
- Submit lifecycle: button disabled + label swap while pending
  (`data-i18n-sending`/`data-i18n-submit` on the form — behavior modules ship
  no strings); success/error paragraphs with `role="status"`/`role="alert"`;
  `form.reset()` on success.
- Field-level zod errors surface via `isInputError` (first message wins);
  everything else falls back to the generic error copy.
- The submit path requires JS (Astro Actions call): there's no `action=`
  fallback. The action still enforces everything server-side, so a custom
  no-JS fallback can be added without changing the contract.

## Extending (new field recipe)

1. Add it to `contactSchema` (limits included).
2. Render it in the right `contact-*.astro` component (+ i18n keys).
3. Pick it up in `buildPayload` (`contact-form-behavior.ts`).
4. Show it in the notification email (`detailRow` in `emails/contact.ts`).
5. Persist it if useful (`contactAttributes` → CRM columns).
