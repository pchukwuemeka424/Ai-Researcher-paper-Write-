/**
 * Password hashing for the local-first (offline) account fallback, built on the
 * Web Crypto API — no dependencies, works offline. Passwords are NEVER stored in
 * plaintext: we store a random per-secret salt + a PBKDF2-SHA256 derived key.
 *
 * This keeps credentials secure at rest even though the account store lives in
 * the browser's IndexedDB. When a Supabase project is connected, Supabase Auth
 * becomes the authority (server-side hashing + emailed password reset) and this
 * module is unused. See docs/HANDOFF.md.
 */

const ITERATIONS = 150_000
const KEY_LEN = 32 // bytes

/** A stored secret: everything needed to verify a password without keeping it. */
export interface HashedSecret {
  salt: string // hex
  hash: string // hex
  iterations: number
}

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function derive(secret: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN * 8,
  )
  return toHex(bits)
}

/** Hash a password/recovery code with a fresh random salt. */
export async function hashSecret(secret: string): Promise<HashedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(secret, salt, ITERATIONS)
  return { salt: toHex(salt.buffer), hash, iterations: ITERATIONS }
}

/** Constant-time-ish verification of a secret against a stored hash. */
export async function verifySecret(secret: string, stored: HashedSecret): Promise<boolean> {
  const candidate = await derive(secret, fromHex(stored.salt), stored.iterations)
  if (candidate.length !== stored.hash.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  return diff === 0
}
