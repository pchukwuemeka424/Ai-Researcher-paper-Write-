import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createAsset,
  deleteAsset,
  listAssets,
} from '@/components/research-note/storage/repositories'
import { relativeTime } from '@/components/research-note/lib/format'
import { PlusIcon, TrashIcon, ImageIcon } from '@/components/research-note/components/icons'
import type { Asset } from '@/components/research-note/storage/types'
import { WorkspaceSaveButton, useCloudSave } from '@/components/research-note/features/sync/CloudSave'

/**
 * Project-wide figures gallery. Upload images here directly, or add them inside
 * notes — both land in the same asset store.
 */
export function FiguresGallery({
  projectId,
  canWrite = true,
  onOpenNotes,
}: {
  projectId: string
  canWrite?: boolean
  /** Jump to Notes (e.g. after creating a note for a figure). */
  onOpenNotes?: () => void
}) {
  const [items, setItems] = useState<{ asset: Asset; url: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])
  const cloud = useCloudSave()

  const refresh = useCallback(async () => {
    urlsRef.current.forEach(URL.revokeObjectURL)
    urlsRef.current = []
    const assets = await listAssets(projectId)
    const mapped = assets.map((asset) => {
      const url = URL.createObjectURL(asset.blob)
      urlsRef.current.push(url)
      return { asset, url }
    })
    setItems(mapped)
  }, [projectId])

  useEffect(() => {
    let alive = true
    setLoading(true)
    refresh()
      .then(() => {
        if (alive) setLoading(false)
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Could not load figures.')
          setLoading(false)
        }
      })
    return () => {
      alive = false
      urlsRef.current.forEach(URL.revokeObjectURL)
      urlsRef.current = []
    }
  }, [refresh])

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) {
      setError('Choose an image file (PNG, JPG, GIF, WebP, …).')
      return
    }
    setError(null)
    setUploading(true)
    try {
      for (const file of list) {
        await createAsset({
          projectId,
          name: file.name || 'figure',
          mime: file.type || 'image/png',
          blob: file,
        })
      }
      await refresh()
      await cloud.saveNow()
      setSavedHint('Figures uploaded and saved.')
      window.setTimeout(() => setSavedHint(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    e.target.value = ''
    if (files?.length) void uploadFiles(files)
  }

  const onRemove = async (id: string, name: string) => {
    if (!window.confirm(`Remove figure "${name || 'image'}"?`)) return
    await deleteAsset(id)
    await refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
        Loading figures…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)]/10 text-[var(--color-brand)]" aria-hidden>
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Figures</h2>
              <p className="text-xs text-[var(--color-muted)]">
                Upload images for this notebook. Charts saved from Data and pastes from Lab Log also appear here.
              </p>
            </div>
          </div>
        </div>
        {canWrite && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFileInput}
            />
            <WorkspaceSaveButton label="Save figures" />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload figure'}
            </button>
            {onOpenNotes && (
              <button
                type="button"
                onClick={onOpenNotes}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface)]"
              >
                Add note
              </button>
            )}
          </>
        )}
      </div>

      {(error || savedHint) && (
        <p
          className={[
            'border-b px-4 py-2 text-sm',
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]',
          ].join(' ')}
          role={error ? 'alert' : undefined}
        >
          {error || savedHint}
        </p>
      )}

      {items.length === 0 ? (
        <div
          className={[
            'm-6 flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors',
            dragOver
              ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5'
              : 'border-[var(--color-border)]',
          ].join(' ')}
          onDragOver={(e) => {
            if (!canWrite) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!canWrite) return
            e.preventDefault()
            setDragOver(false)
            void uploadFiles(e.dataTransfer.files)
          }}
        >
          <h2 className="text-lg font-semibold">No figures yet</h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
            {canWrite
              ? 'Upload images here, or drag and drop them onto this area. You can also insert figures inside a note from the editor toolbar.'
              : 'Figures added to this project will appear here.'}
          </p>
          {canWrite && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
              >
                <PlusIcon /> {uploading ? 'Uploading…' : 'Upload figure'}
              </button>
              {onOpenNotes && (
                <button
                  type="button"
                  onClick={onOpenNotes}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface)]"
                >
                  Create a note
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={[
            'flex-1 overflow-y-auto p-6',
            dragOver ? 'bg-[var(--color-brand)]/5' : '',
          ].join(' ')}
          onDragOver={(e) => {
            if (!canWrite) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!canWrite) return
            e.preventDefault()
            setDragOver(false)
            void uploadFiles(e.dataTransfer.files)
          }}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map(({ asset, url }, i) => (
              <figure
                key={asset.id}
                className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]"
              >
                <img
                  src={url}
                  alt={asset.name}
                  className="aspect-video w-full object-cover"
                />
                <figcaption className="flex items-center gap-1 truncate px-3 py-2 text-xs text-[var(--color-muted)]">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-[var(--color-ink)]">
                      Fig. {i + 1}
                    </span>{' '}
                    · {asset.name || 'image'} · {relativeTime(asset.createdAt)}
                  </span>
                  {canWrite && (
                    <button
                      type="button"
                      title="Remove figure"
                      aria-label={`Remove ${asset.name || 'figure'}`}
                      onClick={() => void onRemove(asset.id, asset.name)}
                      className="shrink-0 rounded p-1 text-[var(--color-muted)] opacity-0 hover:bg-[var(--color-surface)] hover:text-red-600 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
