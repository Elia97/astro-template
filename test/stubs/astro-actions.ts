// Stand-in for `astro:actions` outside the Astro runtime: `isInputError` for the
// client binder (src/components/forms/action-submit.ts), `ActionError` +
// `defineAction` for the action handlers (src/actions/index.ts).

// Mirrored verbatim from node_modules/astro/dist/actions/runtime/client.js so a
// passing test means the real guard would have matched too.
export function isInputError(
  error?: unknown,
): error is { type: 'AstroActionInputError'; issues: unknown[]; fields: Record<string, string[] | undefined> } {
  return (
    typeof error === 'object' &&
    error != null &&
    'type' in error &&
    error.type === 'AstroActionInputError' &&
    'issues' in error &&
    Array.isArray(error.issues)
  )
}

// Same source, minus `status`/`codeToStatus`: the real runtime derives the HTTP
// status from the IANA code map on its way out, and nothing under test reads it
// — `code` and `message` are what the handlers set and the tests assert.
export class ActionError extends Error {
  readonly type = 'AstroActionError'
  readonly code: string

  constructor(params: { code: string; message?: string }) {
    super(params.message)
    this.code = params.code
  }
}

// The callable surface a client module binds to at import time
// (src/components/contact/contact-form-behavior.ts does `submit: actions.contact`).
// Tests replace the member they exercise with a spy; unstubbed it rejects, so a
// test that forgets to is loud rather than silently passing.
export const actions = {
  contact: (_payload: unknown): Promise<{ error?: unknown }> =>
    Promise.reject(new Error('astro:actions stub: actions.contact was called without being stubbed')),
}

// The action wrapper is never invoked under vitest — tests call the exported
// handlers directly — so this only has to let src/actions/index.ts load.
export function defineAction<T>(params: T): T {
  return params
}
