import { type Editor as TiptapEditor, useEditorState } from '@tiptap/react'

/**
 * Formatting toolbar. Uses `useEditorState` so the active/disabled states stay
 * in sync with the selection without re-rendering the whole editor on every
 * keystroke (the TipTap v3 performant pattern).
 */
export function EditorToolbar({
  editor,
  onInsertImage,
}: {
  editor: TiptapEditor
  /** Omit to hide the image button (e.g. AI draft editor). */
  onInsertImage?: () => void
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  })

  const Btn = ({
    active,
    disabled,
    onClick,
    title,
    children,
  }: {
    active?: boolean
    disabled?: boolean
    onClick: () => void
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor focus/selection
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
          : 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]',
      ].join(' ')}
    >
      {children}
    </button>
  )

  const Divider = () => (
    <span className="mx-1 h-5 w-px self-center bg-[var(--color-border)]" />
  )

  const chain = () => editor.chain().focus()

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-1.5">
      <Btn active={s.bold} onClick={() => chain().toggleBold().run()} title="Bold (Ctrl+B)">
        <span className="font-bold">B</span>
      </Btn>
      <Btn active={s.italic} onClick={() => chain().toggleItalic().run()} title="Italic (Ctrl+I)">
        <span className="italic">I</span>
      </Btn>
      <Btn active={s.strike} onClick={() => chain().toggleStrike().run()} title="Strikethrough">
        <span className="line-through">S</span>
      </Btn>
      <Btn active={s.code} onClick={() => chain().toggleCode().run()} title="Inline code">
        <span className="font-mono">{'<>'}</span>
      </Btn>
      <Divider />
      <Btn active={s.h1} onClick={() => chain().toggleHeading({ level: 1 }).run()} title="Heading 1">
        H1
      </Btn>
      <Btn active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} title="Heading 2">
        H2
      </Btn>
      <Btn active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} title="Heading 3">
        H3
      </Btn>
      <Divider />
      <Btn active={s.bullet} onClick={() => chain().toggleBulletList().run()} title="Bullet list">
        •&nbsp;List
      </Btn>
      <Btn active={s.ordered} onClick={() => chain().toggleOrderedList().run()} title="Numbered list">
        1.&nbsp;List
      </Btn>
      <Btn active={s.quote} onClick={() => chain().toggleBlockquote().run()} title="Quote">
        &ldquo;&rdquo;
      </Btn>
      <Btn active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()} title="Code block">
        <span className="font-mono">{'{ }'}</span>
      </Btn>
      <Divider />
      {onInsertImage && (
        <>
          <Btn onClick={onInsertImage} title="Insert image">
            🖼
          </Btn>
          <Divider />
        </>
      )}
      <Btn disabled={!s.canUndo} onClick={() => chain().undo().run()} title="Undo (Ctrl+Z)">
        ↶
      </Btn>
      <Btn disabled={!s.canRedo} onClick={() => chain().redo().run()} title="Redo (Ctrl+Y)">
        ↷
      </Btn>
    </div>
  )
}
