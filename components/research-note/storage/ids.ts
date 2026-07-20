import type { ID, ISODateString } from './types'

/** Stable, collision-resistant id. crypto.randomUUID is available in all our targets. */
export function newId(): ID {
  return crypto.randomUUID()
}

export function nowISO(): ISODateString {
  return new Date().toISOString()
}
