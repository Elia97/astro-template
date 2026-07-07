import process from 'node:process'

export function getSecret(key: string): string | undefined {
  return process.env[key]
}
