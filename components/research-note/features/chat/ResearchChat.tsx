import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/research-note/components/Modal'
import { markdownToHtml } from '@/components/research-note/lib/markdown'
import { assembleProjectContext } from '@/components/research-note/context-providers'
import { generate } from '@/components/research-note/ai/client'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

/**
 * "Ask my research": chat grounded in a project's notes and data.
 */
export function ResearchChat({
  open,
  onClose,
  projectId,
}: {
  open: boolean
  onClose: () => void
  projectId: string
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contextRef.current = null
    setMessages([])
  }, [projectId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, busy])

  const send = async () => {
    const question = input.trim()
    if (!question || busy) return
    setError(null)
    setInput('')
    const history = [...messages, { role: 'user' as const, content: question }]
    setMessages(history)
    setBusy(true)
    try {
      if (contextRef.current === null) {
        const ctx = await assembleProjectContext(projectId)
        contextRef.current = [
          `# Project: ${ctx.title}`,
          ctx.focus ? `Research focus: ${ctx.focus}` : '',
          '',
          '## Connected materials (Materials, Data, Figures, Lab Log, References, drafts)',
          ctx.material || '(no material captured yet)',
        ]
          .filter(Boolean)
          .join('\n')
      }
      const system = [
        'You are CanvAtlas answering questions about a specific research project.',
        'You can read Materials, Data, Figures, Lab Log, References, and existing draft sections.',
        'Answer ONLY from the project material below. If the material does not contain the answer, say so plainly and suggest what to capture. Be concise. Format with Markdown.',
        '\n\n## Project material\n',
        contextRef.current,
      ].join(' ')
      const text = await generate({
        system,
        messages: history,
        maxTokens: 1024,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: text.text }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ask my research">
      <p className="mb-2 text-xs text-[var(--color-muted)]">
        Grounded in Materials, Data, Figures, Lab Log, References, and drafts.
        Try &quot;summarise my results&quot; or &quot;what&apos;s the gap in my introduction?&quot;
      </p>
      <div ref={scrollRef} className="mb-3 h-72 space-y-3 overflow-y-auto rounded-lg border border-[var(--color-border)] p-3">
        {messages.length === 0 && !busy && (
          <p className="text-sm text-[var(--color-muted)]">Ask a question to begin.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={[
                'inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-ink)]',
              ].join(' ')}
            >
              {m.role === 'assistant' ? (
                <div className="rp-chat" dangerouslySetInnerHTML={{ __html: markdownToHtml(m.content) }} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-[var(--color-muted)]">Thinking…</p>}
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
          placeholder="Ask about your research…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </Modal>
  )
}
