import { useEffect, useRef, useState } from 'react'

/**
 * Double-click-to-rename text. Shows plain text until activated, then an input.
 * Commits on Enter/blur, cancels on Escape. Used for section and page names.
 */
export function InlineText({
  value,
  onCommit,
  className,
  inputClassName,
  ariaLabel,
  readOnly,
}: {
  value: string
  onCommit: (next: string) => void
  className?: string
  inputClassName?: string
  ariaLabel?: string
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else setDraft(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={
          inputClassName ??
          'w-full rounded border border-[var(--color-brand)] bg-[var(--color-canvas)] px-1 py-0.5 text-sm outline-none'
        }
      />
    )
  }

  if (readOnly) {
    return <span className={className}>{value}</span>
  }

  return (
    <span
      className={className}
      onDoubleClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      title="Double-click to rename"
    >
      {value}
    </span>
  )
}
