import { useState } from 'react'
import { useReferences } from '@/components/research-note/state/useReferences'
import { useCitationStyle } from '@/components/research-note/state/useCitationStyle'
import { Modal } from '@/components/research-note/components/Modal'
import { TrashIcon } from '@/components/research-note/components/icons'
import type { ReferenceType } from '@/components/research-note/storage/types'
import { fetchByDoi, type ParsedReference } from './crossref'
import {
  formatCitation,
  type CitationStyle,
} from './citation'

const plain = (s: string) => s.replace(/\*/g, '')

/** The References tab: Mendeley-style library with DOI import + citation styles. */
export function ReferencesWorkspace({ projectId }: { projectId: string }) {
  const { references, loading, add, remove } = useReferences(projectId)
  const citation = useCitationStyle(projectId)
  const [doi, setDoi] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const style = citation.style

  const importDoi = async () => {
    setError(null)
    setBusy(true)
    try {
      const parsed = await fetchByDoi(doi)
      await add(parsed)
      setDoi('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  const onStyleChange = async (next: CitationStyle) => {
    await citation.setStyle(next)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 overflow-y-auto p-6">
      {/* Add bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={doi}
            onChange={(e) => setDoi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && doi.trim() && !busy) void importDoi()
            }}
            placeholder="Paste a DOI  (e.g. 10.1038/nature12373)"
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          />
          <button
            type="button"
            onClick={() => void importDoi()}
            disabled={busy || !doi.trim()}
            className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-40"
          >
            {busy ? 'Fetching…' : 'Fetch & add'}
          </button>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface)]"
          >
            Add manually
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {citation.error && <p className="text-sm text-red-600">{citation.error}</p>}
      </div>

      {/* Library header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-muted)]">
          {references.length} reference{references.length === 1 ? '' : 's'}
        </h2>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-[var(--color-muted)]">Style</span>
          <select
            value={style}
            disabled={citation.applying || !citation.loaded}
            onChange={(e) => void onStyleChange(e.target.value as CitationStyle)}
            className="max-w-[16rem] rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
            title="Same styles as Reference Formatter — also updates Publication drafts and References bibliography"
          >
            {citation.styleGroups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.styles.map((s) => (
                  <option key={s.id} value={s.id} title={s.hint}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {citation.applying && (
            <span className="text-xs text-[var(--color-muted)]">Updating…</span>
          )}
        </label>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Changing style uses the same {citation.styles.length}+ styles as Reference Formatter and reformats your library preview plus the Publication manuscript (in-text cites + References section).
      </p>

      {/* Library list */}
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading library…</p>
      ) : references.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-muted)]">
          Your library is empty. Add a reference by DOI above, or enter one
          manually.
        </div>
      ) : (
        <ul className="space-y-2">
          {references.map((ref) => {
            const formatted = plain(formatCitation(ref, style))
            return (
              <li
                key={ref.id}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4"
              >
                <p className="text-sm leading-relaxed">{formatted}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-muted)]">
                  <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 uppercase">
                    {ref.type}
                  </span>
                  {ref.doi && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      {ref.doi}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void copy(ref.id, formatted)}
                    className="ml-auto rounded px-2 py-0.5 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                  >
                    {copiedId === ref.id ? 'Copied ✓' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    title="Delete reference"
                    aria-label="Delete reference"
                    onClick={() => {
                      if (window.confirm('Delete this reference?')) void remove(ref.id)
                    }}
                    className="rounded p-1 opacity-0 hover:bg-[var(--color-surface)] hover:text-red-600 group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ManualReferenceModal
        open={showManual}
        onClose={() => setShowManual(false)}
        onSave={async (parsed) => {
          await add(parsed)
          setShowManual(false)
        }}
      />
    </div>
  )
}

function ManualReferenceModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (ref: ParsedReference) => void | Promise<void>
}) {
  const [f, setF] = useState({
    title: '',
    authors: '',
    year: '',
    containerTitle: '',
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    url: '',
    type: 'article' as ReferenceType,
  })
  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return
    const authors = f.authors
      .split(/[;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    void onSave({
      type: f.type,
      title: f.title.trim(),
      authors,
      year: f.year.trim() || null,
      containerTitle: f.containerTitle.trim() || null,
      volume: f.volume.trim() || null,
      issue: f.issue.trim() || null,
      pages: f.pages.trim() || null,
      publisher: null,
      doi: f.doi.trim() || null,
      url: f.url.trim() || null,
      abstract: null,
      source: 'manual',
    })
    setF({ title: '', authors: '', year: '', containerTitle: '', volume: '', issue: '', pages: '', doi: '', url: '', type: 'article' })
  }

  const field = (
    key: keyof typeof f,
    label: string,
    placeholder = '',
  ) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
        {label}
      </label>
      <input
        value={f[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
      />
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Add reference manually">
      <form onSubmit={submit} className="space-y-3">
        {field('title', 'Title *', 'Article or book title')}
        {field('authors', 'Authors', 'Family, Given; Family, Given')}
        <div className="grid grid-cols-2 gap-3">
          {field('year', 'Year')}
          {field('containerTitle', 'Journal / Book')}
          {field('volume', 'Volume')}
          {field('issue', 'Issue')}
          {field('pages', 'Pages')}
          {field('doi', 'DOI')}
        </div>
        {field('url', 'URL')}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!f.title.trim()}
            className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  )
}
