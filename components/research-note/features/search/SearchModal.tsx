import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { searchAll, type SearchHit } from '@/components/research-note/storage/repositories'
import { debounce } from '@/components/research-note/lib/debounce'

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  page: 'Note',
  reference: 'Reference',
  dataset: 'Dataset',
  draft: 'Draft',
  labentry: 'Lab log',
}

/** Global search across every project's notes, datasets, drafts and lab log. */
export function SearchModal({
  open,
  onClose,
  onOpenProject,
}: {
  open: boolean
  onClose: () => void
  onOpenProject: (projectId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const run = useMemo(
    () =>
      debounce((q: string) => {
        searchAll(q).then((r) => {
          setHits(r.filter((h) => h.kind !== 'reference'))
          setSearching(false)
        })
      }, 200),
    [],
  )

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else {
      setQuery('')
      setHits([])
    }
  }, [open])

  const onChange = (q: string) => {
    setQuery(q)
    setSearching(q.trim().length >= 2)
    run(q)
  }

  return (
    <Modal open={open} onClose={onClose} title="Search everything">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search notes, data, drafts, lab log…"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
      />
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {query.trim().length < 2 ? (
          <p className="text-sm text-[var(--color-muted)]">Type at least 2 characters.</p>
        ) : searching ? (
          <p className="text-sm text-[var(--color-muted)]">Searching…</p>
        ) : hits.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No matches.</p>
        ) : (
          hits.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onOpenProject(h.projectId)
                onClose()
              }}
              className="block w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-[var(--color-border)] hover:bg-[var(--color-surface)]"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--color-muted)]">
                  {KIND_LABEL[h.kind]}
                </span>
                <span className="truncate text-sm font-medium">{h.title}</span>
                <span className="ml-auto shrink-0 truncate text-xs text-[var(--color-muted)]">{h.projectTitle}</span>
              </div>
              {h.snippet && <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{h.snippet}</p>}
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
