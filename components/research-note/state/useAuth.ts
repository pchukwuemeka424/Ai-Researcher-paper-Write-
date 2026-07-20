import { useCallback, useEffect, useState } from 'react'
import { createAccount, getAccountByEmail } from '@/components/research-note/storage/repositories'
import { hashSecret, verifySecret } from '@/components/research-note/features/auth/crypto'
import {
  getAuthUser,
  sendPasswordReset,
  signInWithPassword as sbSignIn,
  signOut as sbSignOut,
  signUpWithProfile,
  subscribeAuth,
  updatePassword,
} from '@/components/research-note/features/sync/supabaseClient'

/** The signed-in user as the UI sees it — never carries password material. */
export interface AuthUser {
  id: string
  name: string
  email: string
}

/** Supabase connection (from Cloud & Sync settings). Present ⇒ cloud auth. */
export interface SupabaseConfig {
  url?: string
  anonKey?: string
}

const SESSION_KEY = 'canvatlas-session'

function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

function writeSession(user: AuthUser | null) {
  if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else localStorage.removeItem(SESSION_KEY)
}

const CLOUD_ONLY =
  'Password reset by email needs the cloud connected. Open Settings › Cloud & Sync and connect a Supabase project.'

// Enumeration-safe: doesn't reveal whether the email exists, but nudges new
// users toward sign-up.
const SIGNIN_FAILED =
  "We couldn't sign you in. Check your email and password — or if you're new here, use “Create an account” to sign up."

/**
 * Authentication with two backends (chosen automatically):
 *
 * - **Supabase Auth** when a Supabase project is connected (URL + anon key in
 *   Cloud & Sync). Real email/password sign-up with a confirmation email,
 *   sign-in, and **password reset by emailed link** (`resetPasswordForEmail` →
 *   the user returns via the link and sets a new password). Cross-device.
 * - **Local fallback** when no cloud is connected: accounts live in IndexedDB
 *   with PBKDF2-hashed passwords so the app is usable offline. Email-based reset
 *   isn't available offline (there's no mail server) — it activates once the
 *   cloud is connected.
 *
 * Either way, once signed in the session persists and all data stays local-first.
 */
export function useAuth(supabase?: SupabaseConfig) {
  const url = supabase?.url?.trim() ?? ''
  const key = supabase?.anonKey?.trim() ?? ''
  const configured = Boolean(url && key)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  // True after the user follows an emailed reset link — force the set-password UI.
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    let alive = true
    let unsub: (() => void) | undefined
    setReady(false)
    ;(async () => {
      if (configured) {
        // A reset link returns to the app with `type=recovery` in the URL hash.
        if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
          setRecoveryMode(true)
        }
        try {
          const u = await getAuthUser(url, key)
          if (alive) setUser(u)
          unsub = await subscribeAuth(url, key, (event, su) => {
            if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
            setUser(su)
          })
        } catch {
          if (alive) setUser(null)
        }
      } else {
        setUser(readSession())
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
      unsub?.()
    }
  }, [configured, url, key])

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string }): Promise<{ needsConfirmation: boolean }> => {
      if (configured) {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : ''
        const { hasSession } = await signUpWithProfile(url, key, input.email, input.password, input.name, redirectTo)
        // If confirmation is on, there's no session yet — the user must confirm by email.
        return { needsConfirmation: !hasSession }
      }
      const password = await hashSecret(input.password)
      const account = await createAccount({ name: input.name, email: input.email, password })
      const u: AuthUser = { id: account.id, name: account.name, email: account.email }
      writeSession(u)
      setUser(u)
      return { needsConfirmation: false }
    },
    [configured, url, key],
  )

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      if (configured) {
        try {
          await sbSignIn(url, key, input.email, input.password)
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          // Wrong email/password → friendly nudge; surface real errors
          // (bad API key, network, rate limit) unchanged so they aren't masked.
          if (/invalid login credentials/i.test(msg)) throw new Error(SIGNIN_FAILED)
          throw e
        }
        const u = await getAuthUser(url, key)
        setUser(u)
        return
      }
      const account = await getAccountByEmail(input.email)
      if (!account || !(await verifySecret(input.password, account.password))) {
        throw new Error(SIGNIN_FAILED)
      }
      const u: AuthUser = { id: account.id, name: account.name, email: account.email }
      writeSession(u)
      setUser(u)
    },
    [configured, url, key],
  )

  /** Email the user a password-reset link (cloud only). */
  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!configured) throw new Error(CLOUD_ONLY)
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : ''
      await sendPasswordReset(url, key, email, redirectTo)
    },
    [configured, url, key],
  )

  /** Set a new password after following the emailed reset link. */
  const completePasswordReset = useCallback(
    async (newPassword: string) => {
      if (!configured) throw new Error(CLOUD_ONLY)
      await updatePassword(url, key, newPassword)
      setRecoveryMode(false)
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    },
    [configured, url, key],
  )

  const signOut = useCallback(async () => {
    if (configured) {
      try {
        await sbSignOut(url, key)
      } catch {
        /* ignore network errors on sign-out */
      }
    }
    writeSession(null)
    setUser(null)
  }, [configured, url, key])

  return {
    user,
    ready,
    recoveryMode,
    cloudAuth: configured,
    signUp,
    signIn,
    requestPasswordReset,
    completePasswordReset,
    signOut,
  }
}
