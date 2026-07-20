import { useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { TrashIcon } from '@/components/research-note/components/icons'
import { useMembers } from '@/components/research-note/state/useMembers'
import type { MemberRole } from '@/components/research-note/storage/types'
import type { EffectiveRole } from './permissions'

/**
 * Collaboration panel: invite people to THIS project only (View-only or
 * View+Edit), manage their roles, and preview the project as a collaborator to
 * see the read-only gate. Authoritative access control is the Supabase RLS in
 * supabase/schema.sql — the UI gate mirrors it.
 */
export function ShareModal({
  open,
  onClose,
  projectId,
  effectiveRole,
  onChangeEffectiveRole,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  effectiveRole: EffectiveRole
  onChangeEffectiveRole: (role: EffectiveRole) => void
}) {
  const { members, invite, setRole, remove } = useMembers(projectId)
  const [email, setEmail] = useState('')
  const [role, setInviteRole] = useState<MemberRole>('view')
  const [error, setError] = useState<string | null>(null)

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    setError(null)
    await invite(value, role)
    setEmail('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Share this project">
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        Invitees can access <strong>only this project</strong> — never your whole
        account. Choose <strong>View-only</strong> or <strong>View + Edit</strong>.
      </p>

      <form onSubmit={onInvite} className="flex flex-wrap items-center gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@email.com"
          className="min-w-48 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <select
          value={role}
          onChange={(e) => setInviteRole(e.target.value as MemberRole)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        >
          <option value="view">View-only</option>
          <option value="edit">View + Edit</option>
        </select>
        <button type="submit" className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)]">
          Invite
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No collaborators yet.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
              <span className="flex-1 truncate">{m.email}</span>
              <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-muted)]">
                {m.status}
              </span>
              <select
                value={m.role}
                onChange={(e) => void setRole(m.id, e.target.value as MemberRole)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-1.5 py-1 text-xs outline-none focus:border-[var(--color-brand)]"
              >
                <option value="view">View-only</option>
                <option value="edit">View + Edit</option>
              </select>
              <button
                type="button"
                title="Remove collaborator"
                aria-label={`Remove ${m.email}`}
                onClick={() => void remove(m.id)}
                className="rounded p-1 text-[var(--color-muted)] hover:text-red-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Preview-as: demonstrates the read-only gate for collaborators. */}
      <div className="mt-5 rounded-lg border border-dashed border-[var(--color-border)] p-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-[var(--color-muted)]">Preview this project as</span>
          <select
            value={effectiveRole}
            onChange={(e) => onChangeEffectiveRole(e.target.value as EffectiveRole)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
          >
            <option value="owner">Owner (full control)</option>
            <option value="edit">View + Edit collaborator</option>
            <option value="view">View-only collaborator</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          A View-only collaborator sees everything but cannot edit notes, data, or
          drafts. This preview toggles the same gate locally.
        </p>
      </div>
    </Modal>
  )
}
