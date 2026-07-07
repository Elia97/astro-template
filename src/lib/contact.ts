import { z } from 'astro/zod'

// Contract of the contact action (src/actions/index.ts). Validation lives
// here so client and server share one source of truth; extending the form
// starts by extending this schema (docs/guides/forms.md).
export const contactSchema = z.object({
  firstName: z.string().trim().max(100).default(''),
  lastName: z.string().trim().max(100).default(''),
  email: z.string().trim().max(254).pipe(z.email()),
  message: z.string().trim().max(2000).default(''),
  // GDPR consent must be an explicit true — not merely truthy.
  consent: z.literal(true),
})

export type ContactRequest = z.infer<typeof contactSchema>

/** CRM attributes persisted with the contact (Brevo upsert). */
export function contactAttributes(request: ContactRequest): Record<string, string> {
  return {
    FIRSTNAME: request.firstName,
    LASTNAME: request.lastName,
  }
}
