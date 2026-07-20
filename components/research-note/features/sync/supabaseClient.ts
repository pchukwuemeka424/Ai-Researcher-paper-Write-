import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanHeaderToken, cleanUrl } from '@/components/research-note/shared/sanitize'

/**
 * Lazily create and cache one Supabase client from the user's configured URL +
 * anon key. `@supabase/supabase-js` is dynamically imported so it stays out of
 * the eager bundle and only loads when cloud sync is actually used.
 *
 * The anon key is client-safe: all access is gated by Row-Level Security
 * (see supabase/schema.sql). The service-role key is never used client-side.
 */
let cached: { url: string; key: string; client: SupabaseClient } | null = null

export async function getSupabaseClient(
  url: string,
  anonKey: string,
): Promise<SupabaseClient> {
  // Strip paste artifacts (bullets from a masked key, NBSP, newlines) that would
  // otherwise throw "non ISO-8859-1 code point" when set as the apikey header.
  url = cleanUrl(url)
  anonKey = cleanHeaderToken(anonKey)
  if (cached && cached.url === url && cached.key === anonKey) return cached.client
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  cached = { url, key: anonKey, client }
  return client
}

export async function signInWithPassword(
  url: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const client = await getSupabaseClient(url, anonKey)
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.user
}

export async function signUpWithPassword(
  url: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const client = await getSupabaseClient(url, anonKey)
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  return data.user
}

/** Sign up carrying a display name + a redirect for the confirmation email. */
export async function signUpWithProfile(
  url: string,
  anonKey: string,
  email: string,
  password: string,
  name: string,
  redirectTo: string,
): Promise<{ hasSession: boolean }> {
  const client = await getSupabaseClient(url, anonKey)
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: redirectTo },
  })
  if (error) throw new Error(error.message)
  return { hasSession: Boolean(data.session) }
}

/** Send a password-reset link to the email address (Supabase emails it). */
export async function sendPasswordReset(
  url: string,
  anonKey: string,
  email: string,
  redirectTo: string,
): Promise<void> {
  const client = await getSupabaseClient(url, anonKey)
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(error.message)
}

/** Set a new password for the user in the current (recovery) session. */
export async function updatePassword(
  url: string,
  anonKey: string,
  newPassword: string,
): Promise<void> {
  const client = await getSupabaseClient(url, anonKey)
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

interface SupaAuthUser {
  id: string
  email: string
  name: string
}

function mapUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): SupaAuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.name as string) || u.email || 'Researcher',
  }
}

/** The currently signed-in Supabase user, or null. */
export async function getAuthUser(url: string, anonKey: string): Promise<SupaAuthUser | null> {
  const client = await getSupabaseClient(url, anonKey)
  const { data } = await client.auth.getSession()
  return mapUser(data.session?.user)
}

/** Subscribe to auth changes; the callback also flags password-recovery events. */
export async function subscribeAuth(
  url: string,
  anonKey: string,
  cb: (event: string, user: SupaAuthUser | null) => void,
): Promise<() => void> {
  const client = await getSupabaseClient(url, anonKey)
  const { data } = client.auth.onAuthStateChange((event, session) => {
    cb(event, mapUser(session?.user))
  })
  return () => data.subscription.unsubscribe()
}

export async function signOut(url: string, anonKey: string) {
  const client = await getSupabaseClient(url, anonKey)
  await client.auth.signOut()
}

export async function currentUserEmail(
  url: string,
  anonKey: string,
): Promise<string | null> {
  const client = await getSupabaseClient(url, anonKey)
  const { data } = await client.auth.getUser()
  return data.user?.email ?? null
}
