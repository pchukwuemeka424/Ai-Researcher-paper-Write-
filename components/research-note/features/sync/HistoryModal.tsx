import { useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { relativeTime } from '@/components/research-note/lib/format'
import type { SnapshotMeta, Snapshot } from './backend'
import { getVersion } from './engine'
import type { SyncSettings } from './syncSettings'

/**
 * Time-travel History (non-negotiable #3): scrub the project's version timeline,
 * preview any past state, and restore it non-destructively.
 */
export function HistoryModal({
  open,
  onClose,
  syncSettings,
  versions,
  busy,
  onRestore,
}: {
  open: boolean
  onClose: () => void
  syncSettings: SyncSettings
  versions: SnapshotMeta[]
  busy: boolean
  onRestore: (id: string) => void
}) {
  const [preview, setPreview] = useState<Snapshot | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const doPreview = async (id: string) => {
    setLoadingId(id)
    const snap = await getVersion(syncSettings, id)
    setPreview(snap ?? null)
    setLoadingId(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Version history (time-travel)">
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        Every Synchronize saves a timestamped version. Restore any version — it's
        non-destructive (the current state is auto-saved first, and nothing is
        ever erased).
      </p>

      {versions.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No versions yet. Click <strong>Synchronize</strong> to save one.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {versions.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => void doPreview(v.id)}
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-left text-sm',
                    preview?.id === v.id
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]',
                  ].join(' ')}
                >
                  <div className="font-medium">{v.label}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {new Date(v.timestamp).toLocaleString()} · {relativeTime(v.timestamp)}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            {loadingId ? (
              <p className="text-[var(--color-muted)]">Loading preview…</p>
            ) : preview ? (
              <div className="space-y-2">
                <p className="font-medium">{preview.state.project?.title ?? 'Project'}</p>
                <dl className="grid grid-cols-2 gap-1 text-xs text-[var(--color-muted)]">
                  <div>Pages: {preview.state.pages.length}</div>
                  <div>Datasets: {preview.state.datasets.length}</div>
                  <div>References: {preview.state.references.length}</div>
                  <div>Drafts: {preview.state.drafts.length}</div>
                </dl>
                {preview.state.pages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-muted)]">Pages</p>
                    <ul className="mt-0.5 list-disc pl-4 text-xs">
                      {preview.state.pages.slice(0, 6).map((p) => (
                        <li key={p.id} className="truncate">{p.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Restore this version from ${new Date(preview.timestamp).toLocaleString()}? The current state is saved first.`)) {
                      onRestore(preview.id)
                    }
                  }}
                  className="mt-2 w-full rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
                >
                  {busy ? 'Restoring…' : 'Restore this version'}
                </button>
              </div>
            ) : (
              <p className="text-[var(--color-muted)]">Select a version to preview it.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
