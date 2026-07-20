import { useRef, useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { TrashIcon } from '@/components/research-note/components/icons'
import { useTemplates } from '@/components/research-note/state/useTemplates'
import type { TemplateKind } from '@/components/research-note/storage/types'

/** Upload-to-learn template manager: add .docx exemplars the AI imitates. */
export function TemplatesModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string
  open: boolean
  onClose: () => void
}) {
  const { templates, loading, error, addDocx, remove } = useTemplates(projectId)
  const [kind, setKind] = useState<TemplateKind>('journal')
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await addDocx(file, kind)
  }

  return (
    <Modal open={open} onClose={onClose} title="Templates the AI learns from">
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        Upload a journal paper template (<strong>.docx</strong>).
        The AI studies its structure and style and imitates it when drafting and
        formatting — without copying its content.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as TemplateKind)}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
        >
          <option value="journal">Journal paper</option>
          <option value="other">Other</option>
        </select>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-ink)]"
        >
          Upload .docx
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No templates yet.</p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs uppercase text-[var(--color-muted)]">
                {t.kind}
              </span>
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-xs text-[var(--color-muted)]">
                {Math.round(t.content.length / 1000)}k chars
              </span>
              <button
                type="button"
                title="Delete template"
                aria-label={`Delete template ${t.name}`}
                onClick={() => void remove(t.id)}
                className="rounded p-1 text-[var(--color-muted)] hover:text-red-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
