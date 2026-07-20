import { useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { markdownToHtml } from '@/components/research-note/lib/markdown'
import { generate } from '@/components/research-note/ai/client'

/**
 * AI knowledge search via the project OpenRouter LLM.
 */
export function AISearchModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    const q = query.trim()
    if (!q || busy) return
    setError(null)
    setBusy(true)
    setAnswer(null)
    try {
      const system = [
        'You are a research search assistant helping a student or researcher learn about a topic.',
        'Give a clear, well-structured overview in Markdown: a short summary, then key points, and where relevant, notable studies, terms, or methods to explore next.',
        'Answer from your knowledge; note where the reader should verify against primary sources.',
        'Be accurate and concise. Do not fabricate citations or facts.',
      ].join(' ')
      const result = await generate({
        system,
        messages: [{ role: 'user', content: q }],
        maxTokens: 1500,
      })
      setAnswer(result.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Search with AI">
      <p className="mb-2 text-xs text-[var(--color-muted)]">
        Answers from the project AI model. Verify important claims against primary sources.
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run()
          }}
          placeholder="e.g. latest methods for single-cell RNA-seq normalisation"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !query.trim()}
          className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {answer !== null && (
        <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-lg border border-[var(--color-border)] p-4">
          <div className="rp-chat text-sm" dangerouslySetInnerHTML={{ __html: markdownToHtml(answer) }} />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(answer)}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
