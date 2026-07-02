import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Composes class names: clsx resolves conditionals, twMerge dedupes
 * conflicting Tailwind classes (last one wins). Makes it safe to pass
 * overrides from the outside into the UI primitives.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
