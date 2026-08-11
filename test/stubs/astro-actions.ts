// Mirrored verbatim from node_modules/astro/dist/actions/runtime/client.js.
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

// Same source, minus `status`/`codeToStatus`: the runtime derives the HTTP status
// from the IANA code map on its way out, and nothing under test reads it.
export class ActionError extends Error {
  readonly type = 'AstroActionError'
  readonly code: string

  constructor(params: { code: string; message?: string }) {
    super(params.message)
    this.code = params.code
  }
}

export const actions = {
  contact: (_payload: unknown): Promise<{ error?: unknown }> =>
    Promise.reject(new Error('astro:actions stub: actions.contact was called without being stubbed')),
}

export function defineAction<T>(params: T): T {
  return params
}
