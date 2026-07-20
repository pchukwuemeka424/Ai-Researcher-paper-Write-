import { InlineText } from '@/components/research-note/components/InlineText'
import { PlusIcon, TrashIcon, PageIcon } from '@/components/research-note/components/icons'
import type { Page, Section } from '@/components/research-note/storage/types'

/**
 * OneNote-style left rail: sections, each containing its pages. Names are
 * double-click editable. All actions are local and instant.
 */
export function SectionRail({
  sections,
  pages,
  activePageId,
  readOnly = false,
  onSelectPage,
  onAddSection,
  onRenameSection,
  onRemoveSection,
  onAddPage,
  onRenamePage,
  onRemovePage,
}: {
  sections: Section[]
  pages: Page[]
  activePageId: string | null
  readOnly?: boolean
  onSelectPage: (id: string) => void
  onAddSection: () => void
  onRenameSection: (id: string, title: string) => void
  onRemoveSection: (id: string) => void
  onAddPage: (sectionId: string) => void
  onRenamePage: (id: string, title: string) => void
  onRemovePage: (id: string) => void
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-canvas)]">
      <div className="flex-1 overflow-y-auto p-2">
        {sections.length === 0 && (
          <p className="px-2 py-4 text-xs text-[var(--color-muted)]">
            No sections yet. Add one to start capturing notes.
          </p>
        )}

        {sections.map((section) => {
          const sectionPages = pages.filter((p) => p.sectionId === section.id)
          return (
            <div key={section.id} className="mb-3">
              <div className="group flex items-center gap-1 rounded-md px-2 py-1">
                <InlineText
                  value={section.title}
                  onCommit={(t) => onRenameSection(section.id, t)}
                  ariaLabel="Section name"
                  readOnly={readOnly}
                  className="flex-1 cursor-text text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
                />
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      title="Add page"
                      aria-label={`Add page to ${section.title}`}
                      onClick={() => onAddPage(section.id)}
                      className="rounded p-0.5 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete section"
                      aria-label={`Delete section ${section.title}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete section "${section.title}" and its ${sectionPages.length} page(s)?`,
                          )
                        )
                          onRemoveSection(section.id)
                      }}
                      className="rounded p-0.5 text-[var(--color-muted)] opacity-0 hover:bg-[var(--color-surface)] hover:text-red-600 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              <ul className="mt-0.5">
                {sectionPages.map((page) => {
                  const active = page.id === activePageId
                  return (
                    <li key={page.id}>
                      <div
                        className={[
                          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm',
                          active
                            ? 'bg-[var(--color-brand)]/10 text-[var(--color-ink)]'
                            : 'text-[var(--color-ink)] hover:bg-[var(--color-surface)]',
                        ].join(' ')}
                      >
                        <PageIcon
                          className={[
                            'h-3.5 w-3.5 shrink-0',
                            active
                              ? 'text-[var(--color-brand)]'
                              : 'text-[var(--color-muted)]',
                          ].join(' ')}
                        />
                        <button
                          type="button"
                          onClick={() => onSelectPage(page.id)}
                          className="flex-1 truncate text-left"
                        >
                          <InlineText
                            value={page.title || 'Untitled page'}
                            onCommit={(t) => onRenamePage(page.id, t)}
                            ariaLabel="Page name"
                            readOnly={readOnly}
                            className="cursor-pointer"
                          />
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            title="Delete page"
                            aria-label={`Delete page ${page.title}`}
                            onClick={() => {
                              if (window.confirm(`Delete page "${page.title}"?`))
                                onRemovePage(page.id)
                            }}
                            className="rounded p-0.5 text-[var(--color-muted)] opacity-0 hover:bg-[var(--color-canvas)] hover:text-red-600 group-hover:opacity-100"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
                {sectionPages.length === 0 && !readOnly && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onAddPage(section.id)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
                    >
                      + Add a page
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <div className="m-2 flex flex-col gap-1.5">
          {sections.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const target =
                  pages.find((p) => p.id === activePageId)?.sectionId ?? sections[0]!.id
                onAddPage(target)
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
            >
              <PlusIcon className="h-3.5 w-3.5" /> New note
            </button>
          )}
          <button
            type="button"
            onClick={onAddSection}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add section
          </button>
        </div>
      )}
    </aside>
  )
}
