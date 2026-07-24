import { useEffect, useState } from 'react'
import {
  OUTPUT_TABS,
  PUBLICATION_SECTION_GUIDES,
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
import {
  CloseIcon,
  CommentIcon,
  ExportIcon,
  InfoIcon,
  LightbulbIcon,
  ManuscriptIcon,
  TemplateIcon,
} from '@/components/research-note/components/icons'

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
  const [guideOpen, setGuideOpen] = useState(true)
  /** Bumped after AI generate/reformat so the Word editor remounts with new content. */
  const [editorEpoch, setEditorEpoch] = useState(0)

  const isPublication = activeOutput === 'publication'
  const section = isPublication ? activeSection : null
  const draft = drafts.getDraft(activeOutput, section)
  const slotKey = drafts.slot(activeOutput, section)
  const isPlainField = isPlainPublicationSection(section)
  const isReferencesSection = isAutoManagedPublicationSection(section)
  const sectionGuide =
    isPublication && section ? PUBLICATION_SECTION_GUIDES[section] : null

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
    <div className="rn-output">
      {!hideTypeTabs && (
        <div className="rn-output-type-tabs">
          {OUTPUT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveOutput(key)}
              className={`rn-output-type-tab${activeOutput === key ? ' is-active' : ''}`}
            >
              {OUTPUT_TABS[key]}
            </button>
          ))}
        </div>
      )}

      <div className="rn-output-layout">
        {isPublication && (
          <aside className="rn-output-sections" aria-label="Manuscript sections">
            <div className="rn-output-sections-head">
              <ManuscriptIcon className="h-4 w-4" />
              <span>Sections</span>
            </div>
            <p className="rn-output-sections-hint">
              Write in order. References update when you change citation style.
            </p>
            <ol className="rn-output-section-list">
              {PUBLICATION_SECTIONS.map((sec, index) => {
                const active = sec === activeSection
                const filled = Boolean(
                  draftContentToPlainText(drafts.getDraft(activeOutput, sec)?.content ?? '').trim(),
                )
                return (
                  <li key={sec}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection(sec)
                        setGuideOpen(true)
                      }}
                      className={`rn-output-section-item${active ? ' is-active' : ''}${filled ? ' is-filled' : ''}`}
                    >
                      <span className="rn-output-section-index" aria-hidden>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="rn-output-section-label">{sec}</span>
                      {filled && <span className="rn-output-section-dot" aria-label="Has content" />}
                    </button>
                  </li>
                )
              })}
            </ol>
          </aside>
        )}

        <div className="rn-output-stage">
          {isPublication && (
            <div className="rn-output-toolbar">
              <label className="rn-output-style-field">
                <span>Reference style</span>
                <select
                  value={citation.style}
                  disabled={!canWrite || citation.applying || !citation.loaded}
                  onChange={(e) => void onCitationStyleChange(e.target.value as CitationStyle)}
                  title="Same styles as Reference Formatter — updates in-text citations and References across the manuscript"
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
              </label>
              <button
                type="button"
                onClick={() => void onReformat()}
                disabled={!canWrite || citation.applying || !citation.loaded}
                className="rn-workspace-btn rn-workspace-btn-ghost"
                title="Apply the selected reference style to in-text citations and the References section only"
              >
                {citation.applying ? 'Updating…' : 'Reformat cites'}
              </button>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="rn-workspace-btn rn-workspace-btn-ghost rn-output-toolbar-push"
                >
                  <TemplateIcon className="h-3.5 w-3.5" />
                  Templates
                </button>
              )}
            </div>
          )}

          <div className="rn-output-docbar">
            <div className="rn-output-docbar-copy">
              <h3>
                {OUTPUT_TABS[activeOutput as OutputTabKey] ?? activeOutput}
                {section ? ` · ${section}` : ''}
              </h3>
              {isPublication && sectionGuide && (
                <p className="rn-output-docbar-hint">Follow the tip below, then write in the editor.</p>
              )}
            </div>
            <div className="rn-output-docbar-actions">
              {canWrite && (
                <WorkspaceSaveButton
                  label={
                    activeOutput === 'progressReports'
                      ? 'Save progress report'
                      : 'Save draft'
                  }
                  onBeforeSave={() => drafts.flushPending()}
                  className="rn-workspace-btn rn-workspace-btn-ghost"
                />
              )}
              {isReferencesSection && (
                <span className="rn-output-auto-badge">
                  <InfoIcon className="h-3.5 w-3.5" />
                  Auto-updated
                </span>
              )}
              <div className="rn-output-export">
                <button
                  type="button"
                  onClick={() => setShowExport((v) => !v)}
                  disabled={!draft?.content && !isPublication}
                  className="rn-workspace-btn rn-workspace-btn-ghost"
                >
                  <ExportIcon className="h-3.5 w-3.5" />
                  Export
                </button>
                {showExport && (
                  <div
                    className="rn-output-export-menu"
                    onMouseLeave={() => setShowExport(false)}
                  >
                    <p className="rn-output-export-label">This section</p>
                    {EXPORT_FORMATS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        disabled={!draft?.content}
                        onClick={() => void onExport(f)}
                      >
                        {EXPORT_LABELS[f]}
                      </button>
                    ))}
                    {isPublication && (
                      <>
                        <p className="rn-output-export-label rn-output-export-label-split">
                          Full manuscript
                        </p>
                        {EXPORT_FORMATS.map((f) => (
                          <button
                            key={`m-${f}`}
                            type="button"
                            onClick={() => void onExportManuscript(f)}
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
                className="rn-workspace-btn rn-workspace-btn-ghost"
              >
                <CommentIcon className="h-3.5 w-3.5" />
                Comments
              </button>
            </div>
          </div>

          {(drafts.error || formatError || citation.error) && (
            <p className="rn-workspace-alert" role="alert">
              {drafts.error || formatError || citation.error}
            </p>
          )}

          {!drafts.error &&
            !formatError &&
            !citation.error &&
            citation.lastApply &&
            isPublication && (
              <p className="rn-output-status">
                Reference style set to {citation.styleLabel}
                {citation.lastApply.references > 0
                  ? ` — updated ${citation.lastApply.draftsUpdated} section${citation.lastApply.draftsUpdated === 1 ? '' : 's'} (${citation.lastApply.references} references).`
                  : ' — will apply to References as you cite sources.'}
              </p>
            )}

          {guideOpen && sectionGuide && (
            <div className="rn-workspace-guide rn-output-section-guide" role="note">
              <LightbulbIcon className="rn-workspace-guide-icon" />
              <p>{sectionGuide}</p>
              <button
                type="button"
                className="rn-workspace-guide-dismiss"
                aria-label="Dismiss tip"
                onClick={() => setGuideOpen(false)}
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div
            className={[
              'rn-output-editor',
              !isPlainField ? 'rn-output-editor-rich' : 'rn-output-editor-plain',
            ].join(' ')}
          >
            {drafts.loading ? (
              <div className="rn-workspace-loading rn-workspace-loading-inline">
                <p>Opening document…</p>
              </div>
            ) : isPlainField ? (
              <PlainFieldPanel
                label={activeSection}
                hint={sectionGuide ?? undefined}
                placeholder={
                  activeSection === 'Title'
                    ? 'e.g. Artificial Intelligence in Nigerian Higher Education'
                    : 'e.g. artificial intelligence, higher education, Nigeria, pedagogy'
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
              <div className="rn-notes-empty-select">
                <InfoIcon className="h-5 w-5" />
                <p>View-only — ask an editor to open this section.</p>
              </div>
            )}
          </div>
        </div>
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
  hint,
  placeholder,
  value,
  canWrite,
  onChange,
}: {
  label: string
  hint?: string
  placeholder: string
  value: string
  canWrite: boolean
  onChange: (value: string) => void
}) {
  const isTitle = label === 'Title'
  return (
    <div className={`rn-plain-field${isTitle ? ' rn-plain-field-title' : ''}`}>
      <div className="rn-plain-field-card">
        <label htmlFor="plain-draft-field">
          <span className="rn-plain-field-label">{label}</span>
          {hint && <span className="rn-plain-field-sub">{hint}</span>}
        </label>
        {isTitle ? (
          <textarea
            id="plain-draft-field"
            value={value}
            readOnly={!canWrite}
            autoFocus={canWrite}
            rows={3}
            placeholder={placeholder}
            onChange={(e) => {
              if (!canWrite) return
              onChange(e.target.value)
            }}
            className="rn-plain-field-input rn-plain-field-title-input"
          />
        ) : (
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
            className="rn-plain-field-input"
          />
        )}
        <p className="rn-plain-field-meta">
          {canWrite
            ? 'Changes save with the notebook. Use Save draft in the bar above when you want to sync now.'
            : 'This field is view-only.'}
        </p>
      </div>
    </div>
  )
}
