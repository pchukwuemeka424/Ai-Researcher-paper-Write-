import { useEffect, useState } from 'react'
import {
  addLabEntry,
  createAsset,
  deleteLabEntry,
  getAsset,
  listLabEntries,
} from '@/components/research-note/storage/repositories'
import type { LabEntry } from '@/components/research-note/storage/types'
import { relativeTime } from '@/components/research-note/lib/format'
import { FlaskIcon, TrashIcon } from '@/components/research-note/components/icons'
import { WorkspaceSaveButton, useCloudSave } from '@/components/research-note/features/sync/CloudSave'

interface PendingImage {
  assetId: string
  url: string
}

/**
 * Electronic Lab Notebook — a timestamped, append-only experiment log (spec §8 ★).
 * Entries aren't editable once written (reproducibility); the author can delete.
 * Text and pasted images (screenshots, gel photos, plots) can be captured
 * together — paste an image straight into the entry box.
 */
export function ELNPanel({
  projectId,
  canWrite,
  author,
}: {
  projectId: string
  canWrite: boolean
  author: string
}) {
  const [entries, setEntries] = useState<LabEntry[]>([])
  const [text, setText] = useState('')
  const [pending, setPending] = useState<PendingImage[]>([])
  const [loading, setLoading] = useState(true)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const cloud = useCloudSave()

  useEffect(() => {
    let alive = true
    setLoading(true)
    listLabEntries(projectId).then((list) => {
      if (alive) {
        setEntries(list)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [projectId])

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    e.preventDefault()
    for (const file of images) {
      const asset = await createAsset({
        projectId,
        name: file.name || 'pasted-image',
        mime: file.type,
        blob: file,
      })
      setPending((prev) => [...prev, { assetId: asset.id, url: URL.createObjectURL(file) }])
    }
  }

  const add = async () => {
    if (!text.trim() && pending.length === 0) return
    const entry = await addLabEntry({
      projectId,
      author,
      text,
      assetIds: pending.map((p) => p.assetId),
    })
    setEntries((prev) => [entry, ...prev])
    setText('')
    setPending([])
    await cloud.saveNow()
    setSavedHint('Lab log entry saved.')
    window.setTimeout(() => setSavedHint(null), 2500)
  }

  const remove = async (id: string) => {
    await deleteLabEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FlaskIcon className="h-5 w-5 text-[var(--color-brand)]" />
        <h2 className="text-lg font-semibold">Electronic Lab Notebook</h2>
        {canWrite && <WorkspaceSaveButton label="Save lab log" className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-50" />}
      </div>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        Timestamped, append-only experiment log. Each entry is fixed once saved —
        a reproducible record that also feeds the AI&apos;s Methods and Results drafts.
        You can paste images directly into an entry.
      </p>
      {savedHint && (
        <p className="mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
          {savedHint}
        </p>
      )}

      {canWrite && (
        <div className="mb-5 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => void onPaste(e)}
            rows={3}
            placeholder="What did you do / observe? Paste a screenshot or photo too. (e.g. Ran trial 3, 200mg dose, mean RT 248ms)"
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          />
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((p) => (
                <div key={p.assetId} className="relative">
                  <img src={p.url} alt="Pasted" className="h-16 w-16 rounded-md border border-[var(--color-border)] object-cover" />
                  <button
                    type="button"
                    title="Remove image"
                    onClick={() => setPending((prev) => prev.filter((x) => x.assetId !== p.assetId))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--color-ink)] p-0.5 text-[var(--color-canvas)]"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void add()}
              disabled={!text.trim() && pending.length === 0}
              className="rounded-lg bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
            >
              Log entry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading log…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No entries yet.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-[var(--color-border)] pl-4">
          {entries.map((e) => (
            <li key={e.id} className="group relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-ink)]">{e.author}</span>
                <span>· {new Date(e.timestamp).toLocaleString()} · {relativeTime(e.timestamp)}</span>
                {canWrite && (
                  <button
                    type="button"
                    title="Delete entry"
                    aria-label="Delete entry"
                    onClick={() => void remove(e.id)}
                    className="ml-auto rounded p-1 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              {e.text && <p className="mt-0.5 whitespace-pre-wrap text-sm">{e.text}</p>}
              {e.assetIds?.length ? <EntryImages assetIds={e.assetIds} /> : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Resolves an entry's stored image assets to object URLs for display. */
function EntryImages({ assetIds }: { assetIds: string[] }) {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    const created: string[] = []
    ;(async () => {
      for (const id of assetIds) {
        const asset = await getAsset(id)
        if (asset) created.push(URL.createObjectURL(asset.blob))
      }
      if (alive) setUrls(created)
      else created.forEach(URL.revokeObjectURL)
    })()
    return () => {
      alive = false
      created.forEach(URL.revokeObjectURL)
    }
  }, [assetIds])

  if (urls.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="Lab entry attachment" className="max-h-40 rounded-md border border-[var(--color-border)]" />
        </a>
      ))}
    </div>
  )
}
