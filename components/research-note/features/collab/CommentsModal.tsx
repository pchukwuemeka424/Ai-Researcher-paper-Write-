import { useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { TrashIcon } from '@/components/research-note/components/icons'
import { relativeTime } from '@/components/research-note/lib/format'
import { useComments } from '@/components/research-note/state/useComments'
import type { CommentTargetKind } from '@/components/research-note/storage/types'

/**
 * Google-Docs-style feedback thread on a note page or an AI draft. Commenting is
 * allowed for ALL collaborators (including View-only supervisors) — leaving
 * feedback never modifies the underlying text (spec §7E).
 */
export function CommentsModal({
  open,
  onClose,
  projectId,
  targetKind,
  targetId,
  targetLabel,
  author,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  targetKind: CommentTargetKind
  targetId: string
  targetLabel: string
  author: string
}) {
  const { comments, add, toggleResolved, remove } = useComments(projectId, targetKind, targetId)
  const [body, setBody] = useState('')

  const onAdd = async () => {
    await add(author, body)
    setBody('')
  }

  return (
    <Modal open={open} onClose={onClose} title={`Comments · ${targetLabel}`}>
      <div className="mb-3 max-h-72 space-y-2 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No comments yet. Supervisors and collaborators can leave feedback here
            without changing the text.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={[
                'rounded-lg border px-3 py-2 text-sm',
                c.resolved
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-70'
                  : 'border-[var(--color-border)]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-ink)]">{c.author}</span>
                <span>· {relativeTime(c.createdAt)}</span>
                {c.resolved && <span className="rounded bg-green-100 px-1.5 text-[10px] uppercase text-green-700">resolved</span>}
                <button
                  type="button"
                  onClick={() => void toggleResolved(c.id, !c.resolved)}
                  className="ml-auto rounded px-1.5 py-0.5 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                >
                  {c.resolved ? 'Reopen' : 'Resolve'}
                </button>
                <button
                  type="button"
                  title="Delete comment"
                  aria-label="Delete comment"
                  onClick={() => void remove(c.id)}
                  className="rounded p-1 hover:text-red-600"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
              <p className={c.resolved ? 'mt-1 line-through' : 'mt-1'}>{c.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a comment or suggestion…"
          className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>Commenting as {author}</span>
          <button
            type="button"
            onClick={() => void onAdd()}
            disabled={!body.trim()}
            className="rounded-lg bg-[var(--color-brand)] px-4 py-1.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            Comment
          </button>
        </div>
      </div>
    </Modal>
  )
}
