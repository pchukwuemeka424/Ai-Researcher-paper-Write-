import { useEffect, useState } from 'react'
import { APP_NAME, APP_TAGLINE } from '@/components/research-note/config/branding'
import { NotebookIcon } from '@/components/research-note/components/icons'
import type { useAuth } from '@/components/research-note/state/useAuth'

type Mode = 'signin' | 'signup' | 'forgot' | 'recovery'

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]'

// Deliberately permissive: accept any real email (personal or institutional).
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

/**
 * The authentication gate. The whole app sits behind this — you must create an
 * account (name, email, password + confirmation) or sign in to use CanvAtlas.
 *
 * Password recovery is by **emailed reset link** (Supabase Auth): request a link
 * on the "Forgot password" screen, then follow the link back here to set a new
 * password. Works with any email address. When no cloud is connected, accounts
 * are local and email reset is unavailable until you connect one.
 */
export function AuthGate({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Following an emailed reset link forces the "set a new password" screen.
  const effectiveMode: Mode = auth.recoveryMode ? 'recovery' : mode

  useEffect(() => {
    if (auth.recoveryMode) {
      setError(null)
      setNotice(null)
      setPassword('')
      setConfirm('')
    }
  }, [auth.recoveryMode])

  const reset = (to: Mode) => {
    setMode(to)
    setError(null)
    setNotice(null)
    setPassword('')
    setConfirm('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (effectiveMode === 'signup') {
        if (name.trim().length < 2) throw new Error('Please enter your name.')
        if (!isEmail(email)) throw new Error('Please enter a valid email address.')
        if (password.length < 8) throw new Error('Password must be at least 8 characters.')
        if (password !== confirm) throw new Error('Passwords do not match.')
        const { needsConfirmation } = await auth.signUp({ name, email, password })
        if (needsConfirmation) {
          setNotice(`Almost there — we've emailed a confirmation link to ${email.trim()}. Confirm it, then sign in.`)
          reset('signin')
        }
        // Otherwise a session started and the app takes over.
      } else if (effectiveMode === 'signin') {
        if (!isEmail(email)) throw new Error('Please enter a valid email address.')
        await auth.signIn({ email, password })
      } else if (effectiveMode === 'forgot') {
        if (!isEmail(email)) throw new Error('Please enter a valid email address.')
        await auth.requestPasswordReset(email)
        setNotice(`If an account exists for ${email.trim()}, a password-reset link is on its way. Check your inbox.`)
        reset('signin')
      } else {
        // recovery: set the new password for the reset session
        if (password.length < 8) throw new Error('New password must be at least 8 characters.')
        if (password !== confirm) throw new Error('Passwords do not match.')
        await auth.completePasswordReset(password)
        setNotice('Password updated. Please sign in with your new password.')
        reset('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const heading =
    effectiveMode === 'signin'
      ? 'Sign in'
      : effectiveMode === 'signup'
        ? 'Create your account'
        : effectiveMode === 'forgot'
          ? 'Reset your password'
          : 'Set a new password'

  const subtitle =
    effectiveMode === 'signin'
      ? 'Welcome back. Sign in to your research workspace.'
      : effectiveMode === 'signup'
        ? 'One account keeps your projects, notes and drafts in sync.'
        : effectiveMode === 'forgot'
          ? "Enter your email and we'll send you a link to reset your password."
          : 'Choose a new password for your account.'

  return (
    <Shell>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {effectiveMode === 'signup' && (
          <Field label="Full name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ada Lovelace" />
          </Field>
        )}

        {effectiveMode !== 'recovery' && (
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
          </Field>
        )}

        {effectiveMode !== 'forgot' && (
          <Field label={effectiveMode === 'recovery' ? 'New password' : 'Password'}>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={effectiveMode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={effectiveMode === 'signin' ? 'Your password' : 'At least 8 characters'}
            />
          </Field>
        )}

        {(effectiveMode === 'signup' || effectiveMode === 'recovery') && (
          <Field label="Confirm password">
            <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Re-enter password" />
          </Field>
        )}

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</p>}

        <button type="submit" disabled={busy} className="w-full rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50">
          {busy
            ? 'Please wait…'
            : effectiveMode === 'signin'
              ? 'Sign in'
              : effectiveMode === 'signup'
                ? 'Create account'
                : effectiveMode === 'forgot'
                  ? 'Email me a reset link'
                  : 'Update password'}
        </button>
      </form>

      {effectiveMode !== 'recovery' && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {effectiveMode === 'signin' ? (
            <>
              <button type="button" className="text-[var(--color-brand)] hover:underline" onClick={() => reset('forgot')}>
                Forgot password?
              </button>
              <button type="button" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]" onClick={() => reset('signup')}>
                Create an account
              </button>
            </>
          ) : (
            <button type="button" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]" onClick={() => reset('signin')}>
              ← Back to sign in
            </button>
          )}
        </div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-ink)]">
            <NotebookIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-[var(--color-muted)]">{APP_TAGLINE}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}
