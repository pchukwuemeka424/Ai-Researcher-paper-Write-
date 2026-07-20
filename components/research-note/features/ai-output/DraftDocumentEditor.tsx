'use client'

import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorToolbar } from '@/components/research-note/features/notebook/EditorToolbar'
import { debounce } from '@/components/research-note/lib/debounce'
import { draftContentToHtml } from '@/components/research-note/lib/markdown'

/**
 * Word-style rich-text surface for AI Drafts — toolbar + page-like editor.
 * Mount with a stable `key` (e.g. draft slot) so content reloads per section.
 * Persists HTML; callers can convert to Markdown for export.
 */
export function DraftDocumentEditor({
  content,
  onChange,
  editable = true,
}: {
  /** Markdown (from AI) or HTML (from prior edits). Used only on mount. */
  content: string
  onChange: (html: string) => void
  editable?: boolean
}) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialHtml = useRef(draftContentToHtml(content)).current

  const debounced = useMemo(
    () =>
      debounce((html: string) => {
        onChangeRef.current(html)
      }, 400),
    [],
  )
  useEffect(() => () => debounced.flush(), [debounced])

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml,
    editable,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: 'rp-editor draft-doc-page focus:outline-none',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      debounced(ed.getHTML())
    },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  if (!editor) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="draft-doc-sheet min-h-full w-full bg-[var(--color-canvas)]">
            <div className="min-h-[70vh] w-full px-6 py-6 sm:px-8 sm:py-8" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
      {editable && <EditorToolbar editor={editor} />}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="draft-doc-sheet min-h-full w-full bg-[var(--color-canvas)]">
          <div className="min-h-[70vh] w-full px-6 py-6 sm:px-8 sm:py-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}
