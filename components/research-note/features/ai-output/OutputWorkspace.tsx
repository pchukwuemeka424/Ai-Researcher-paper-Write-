import { useEffect, useState } from 'react'
import {
  OUTPUT_TABS,
  PUBLICATION_SECTIONS,
  isAutoManagedPublicationSection,
  isPlainPublicationSection,
  type OutputTabKey,
} from '@/components/research-note/config/branding'
import type { OutputType } from '@/components/research-note/storage/types'
import { useDrafts } from '@/components/research-note/state/useDrafts'
import { useCitationStyle } from '@/components/research-note/state/useCitationStyle'
import type { CitationStyle } from '@/components/research-note/features/references/citation'
import type { AISettings } from '@/components/research-note/ai/settings'
import {
  draftContentToMarkdown,
  draftContentToPlainText,
} from '@/components/research-note/lib/markdown'
import { DraftDocumentEditor } from './DraftDocumentEditor'
import { assemblePublicationManuscript } from '@/components/research-note/ai/formatting'
import {
  EXPORT_LABELS,
  exportDraft,
  type ExportFormat,
} from '@/components/research-note/features/export/exporters'
import { TemplatesModal } from './TemplatesModal'
import { CommentsModal } from '@/components/research-note/features/collab/CommentsModal'
import { WorkspaceSaveButton } from '@/components/research-note/features/sync/CloudSave'

const OUTPUT_KEYS = Object.keys(OUTPUT_TABS) as OutputTabKey[]
const EXPORT_FORMATS = Object.keys(EXPORT_LABELS) as ExportFormat[]

/** The OUTPUT workspace: Word-style section drafts + reference-style reformat + export. */
export function OutputWorkspace({
  projectId,
  settings,
  canWrite,
  author,
  /** When set, parent owns the draft-type tabs (AI Drafts header). */
  outputType: controlledOutput,
}: {
  projectId: string
  settings: AISettings
  canWrite: boolean
  author: string
  outputType?: OutputTabKey
}) {
  const drafts = useDrafts(projectId, settings)
  const citation = useCitationStyle(projectId)
  const [internalOutput, setInternalOutput] = useState<OutputType>('publication')
  const activeOutput = controlledOutput ?? internalOutput
  const setActiveOutput = setInternalOutput
  const hideTypeTabs = Boolean(controlledOutput)
  const [activeSection, setActiveSection] = useState<string>(PUBLICATION_SECTIONS[0])
  const [formatError, setFormatError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showComments, setShowComments] = useState(false)
  /** Bumped after AI generate/reformat so the Word editor remounts with new content. */
  const [editorEpoch, setEditorEpoch] = useState(0)

  const isPublication = activeOutput === 'publication'
  const section = isPublication ? activeSection : null
  const draft = drafts.getDraft(activeOutput, section)
  const slotKey = drafts.slot(activeOutput, section)
  const isPlainField = isPlainPublicationSection(section)
  const generating = drafts.busySlot === slotKey
  const hasSectionContent = Boolean(draft?.content.trim())
  const isReferencesSection = isAutoManagedPublicationSection(section)
  const generateLabel = hasSectionContent ? `Refine ${section}` : `Generate ${section}`

  // Ensure a draft row exists so Title/Keywords inputs and Word sections can save.
  // Do not gate the editor on this — waiting caused section-switch flicker.
  useEffect(() => {
    if (!canWrite || drafts.loading) return
    if (drafts.getDraft(activeOutput, section)) return
    void drafts.addBlank(activeOutput, section)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, drafts.loading, activeOutput, section, draft?.id])

  const onCitationStyleChange = async (next: CitationStyle) => {
    if (!canWrite || citation.applying) return
    const ok = await citation.setStyle(next)
    if (!ok) return
    await drafts.reload()
    setEditorEpoch((n) => n + 1)
  }

  /** Reformat = apply reference style only (never rewrite section content with AI). */
  const onReformat = async () => {
    if (!canWrite || !isPublication || citation.applying) return
    setFormatError(null)
    const ok = await citation.reapplyStyle()
    if (!ok) return
    await drafts.reload()
    setEditorEpoch((n) => n + 1)
  }

  const onGenerateDraft = async () => {
    if (!canWrite || generating || !isPublication || !section || isReferencesSection) return
    const ok = await drafts.generate(activeOutput, section, {
      existingContent: draft?.content ?? null,
    })
    if (ok) setEditorEpoch((n) => n + 1)
  }

  const baseName = `${OUTPUT_TABS[activeOutput as OutputTabKey] ?? activeOutput}${section ? '-' + section : ''}`

  const onExport = async (format: ExportFormat) => {
    setShowExport(false)
    if (draft?.content) await exportDraft(format, baseName, draftContentToMarkdown(draft.content))
  }

  const onExportManuscript = async (format: ExportFormat) => {
    setShowExport(false)
    const manuscript = await assemblePublicationManuscript(projectId)
    if (manuscript.trim()) {
      await exportDraft(format, 'Manuscript', draftContentToMarkdown(manuscript))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hideTypeTabs && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2">
          {OUTPUT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveOutput(key)}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium',
                activeOutput === key
                  ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
              ].join(' ')}
            >
              {OUTPUT_TABS[key]}
            </button>
          ))}
        </div>
      )}

      {isPublication && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5">
          {PUBLICATION_SECTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSection(sec)}
              className={[
                'rounded px-2 py-1 text-xs',
                sec === activeSection
                  ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]',
              ].join(' ')}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2 text-sm">
        {isPublication && (
          <>
            <span className="text-[var(--color-muted)]">Reference style</span>
            <select
              value={citation.style}
              disabled={!canWrite || citation.applying || !citation.loaded}
              onChange={(e) => void onCitationStyleChange(e.target.value as CitationStyle)}
              className="max-w-[16rem] rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
              title="Same styles as Reference Formatter — updates in-text citations and References across the publication"
            >
              {citation.styleGroups.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {group.styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void onReformat()}
              disabled={!canWrite || citation.applying || !citation.loaded}
              className="rounded-md border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-surface)] disabled:opacity-50"
              title="Apply the selected reference style to in-text citations and the References section only — does not rewrite section content"
            >
              {citation.applying ? 'Updating style…' : 'Reformat'}
            </button>
            {citation.applying && (
              <span className="text-xs text-[var(--color-muted)]">Updating citations…</span>
            )}
          </>
        )}
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="ml-auto rounded-md border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-surface)]"
          >
            Templates
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2">
        <h2 className="text-sm font-semibold">
          {OUTPUT_TABS[activeOutput as OutputTabKey] ?? activeOutput}
          {section ? ` — ${section}` : ''}
        </h2>
        <div className="ml-auto flex items-center gap-1.5">
          {canWrite && (
            <WorkspaceSaveButton
              label={
                activeOutput === 'labReports'
                  ? 'Save lab report'
                  : activeOutput === 'progressReports'
                    ? 'Save progress report'
                    : 'Save draft'
              }
              onBeforeSave={() => drafts.flushPending()}
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface)] disabled:opacity-50"
            />
          )}
          {canWrite && isPublication && section && !isReferencesSection && (
            <button
              type="button"
              onClick={() => void onGenerateDraft()}
              disabled={generating || drafts.busySlot !== null}
              className="rounded-md bg-[var(--color-brand)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-ink)] hover:opacity-90 disabled:opacity-50"
              title={
                hasSectionContent
                  ? `Refine ${section}: checks existing write-up + other filled sections so it stays on topic`
                  : `Generate ${section}: checks other filled sections (Title → Abstract → …) so it stays on the write-up`
              }
            >
              {generating ? (hasSectionContent ? 'Refining…' : 'Generating…') : generateLabel}
            </button>
          )}
          {isReferencesSection && (
            <span className="text-xs text-[var(--color-muted)]">
              Auto-updated from cited sources
            </span>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExport((v) => !v)}
              disabled={!draft?.content && !isPublication}
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-surface)] disabled:opacity-50"
            >
              Export ▾
            </button>
            {showExport && (
              <div
                className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] py-1 text-xs shadow-lg"
                onMouseLeave={() => setShowExport(false)}
              >
                <p className="px-3 py-1 text-[10px] uppercase text-[var(--color-muted)]">This draft</p>
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={!draft?.content}
                    onClick={() => void onExport(f)}
                    className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-surface)] disabled:opacity-40"
                  >
                    {EXPORT_LABELS[f]}
                  </button>
                ))}
                {isPublication && (
                  <>
                    <p className="mt-1 border-t border-[var(--color-border)] px-3 pt-1.5 text-[10px] uppercase text-[var(--color-muted)]">
                      Full manuscript
                    </p>
                    {EXPORT_FORMATS.map((f) => (
                      <button
                        key={`m-${f}`}
                        type="button"
                        onClick={() => void onExportManuscript(f)}
                        className="block w-full px-3 py-1.5 text-left hover:bg-[var(--color-surface)]"
                      >
                        {EXPORT_LABELS[f]}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:bg-[var(--color-surface)]"
          >
            Comments
          </button>
        </div>
      </div>

      {(drafts.error || formatError || citation.error) && (
        <p className="border-b border-[var(--color-border)] bg-red-50 px-4 py-2 text-sm text-red-600">
          {drafts.error || formatError || citation.error}
        </p>
      )}

      {!drafts.error &&
        !formatError &&
        !citation.error &&
        citation.lastApply &&
        isPublication && (
          <p className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs text-[var(--color-muted)]">
            Reference style set to {citation.styleLabel}
            {citation.lastApply.references > 0
              ? ` — updated ${citation.lastApply.draftsUpdated} section${citation.lastApply.draftsUpdated === 1 ? '' : 's'} (${citation.lastApply.references} references).`
              : ' — will apply to new Generate/Refine output and References as you cite sources.'}
          </p>
        )}

      {!drafts.error &&
        !formatError &&
        drafts.lastLiteratureCount !== null &&
        isPublication &&
        section &&
        section !== 'Title' &&
        section !== 'Abstract' &&
        section !== 'Keywords' &&
        section !== 'References' && (
          <p className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs text-[var(--color-muted)]">
            {drafts.lastLiteratureCount > 0
              ? `Used ${drafts.lastLiteratureCount} paper${drafts.lastLiteratureCount === 1 ? '' : 's'} from the research API to generate this section.`
              : 'Research API returned no papers for this query — drafted from your write-up, sibling sections, and data/lab log only (Materials excluded).'}
            {drafts.lastReferencesSync
              ? ` References: ${drafts.lastReferencesSync.added} added, ${drafts.lastReferencesSync.updated} updated (${drafts.lastReferencesSync.total} total).`
              : ''}
          </p>
        )}

      {isReferencesSection && (
        <p className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-xs text-[var(--color-muted)]">
          Bibliography in {citation.styleLabel}. Change Reference style above to reformat this list and in-text cites across all publication sections.
          It also updates automatically when you Generate or Refine body sections.
        </p>
      )}

      <div
        className={[
          'min-h-0 flex-1',
          !isPlainField ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
        ].join(' ')}
      >
        {drafts.loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            Opening document…
          </div>
        ) : isPlainField ? (
          <PlainFieldPanel
            label={activeSection}
            placeholder={
              activeSection === 'Title'
                ? 'Enter the publication title'
                : 'Enter keywords, separated by commas'
            }
            value={draft ? draftContentToPlainText(draft.content) : ''}
            canWrite={canWrite}
            onChange={(value) => {
              drafts.editDraft(activeOutput, section, value)
            }}
          />
        ) : canWrite || draft ? (
          <DraftDocumentEditor
            key={`${slotKey}::${editorEpoch}`}
            content={draft?.content ?? ''}
            onChange={(html) => drafts.editDraft(activeOutput, section, html)}
            editable={canWrite && !isReferencesSection}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--color-muted)]">
            View-only — ask an editor to open this section.
          </div>
        )}
      </div>

      <TemplatesModal projectId={projectId} open={showTemplates} onClose={() => setShowTemplates(false)} />
      <CommentsModal
        open={showComments}
        onClose={() => setShowComments(false)}
        projectId={projectId}
        targetKind="draft"
        targetId={slotKey}
        targetLabel={`${OUTPUT_TABS[activeOutput as OutputTabKey] ?? activeOutput}${section ? ` — ${section}` : ''}`}
        author={author}
      />
    </div>
  )
}

function PlainFieldPanel({
  label,
  placeholder,
  value,
  canWrite,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  canWrite: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]" htmlFor="plain-draft-field">
        {label}
      </label>
      <input
        id="plain-draft-field"
        type="text"
        value={value}
        readOnly={!canWrite}
        autoFocus={canWrite}
        placeholder={placeholder}
        onChange={(e) => {
          if (!canWrite) return
          onChange(e.target.value)
        }}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 read-only:bg-[var(--color-surface)]"
      />
    </div>
  )
}
