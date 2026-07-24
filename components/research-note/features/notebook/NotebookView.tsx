import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  AI_DRAFT_GUIDES,
  AI_DRAFT_HINTS,
  AI_DRAFT_NAV_GROUPS,
  AI_DRAFT_TABS,
  type AiDraftTabKey,
  type OutputTabKey,
} from '@/components/research-note/config/branding'
import { useNotebook } from '@/components/research-note/state/useNotebook'
import { getProject } from '@/components/research-note/storage/repositories'
import { debounce } from '@/components/research-note/lib/debounce'
import {
  ArrowLeftIcon,
  CloseIcon,
  CommentIcon,
  DownloadIcon,
  ExportIcon,
  FlaskIcon,
  ImageIcon,
  ImportIcon,
  InfoIcon,
  LightbulbIcon,
  ManuscriptIcon,
  NotebookIcon,
  PlusIcon,
  ProgressIcon,
  SaveIcon,
  TableIcon,
} from '@/components/research-note/components/icons'
import type { Page, RichTextDoc } from '@/components/research-note/storage/types'
import { Editor, type EditorApi } from './Editor'
import { SectionRail } from './SectionRail'
import { FiguresGallery } from './FiguresGallery'
import { exportDocToDocx, importDocxToHtml, isDocx } from './docxIO'
import type { AISettings } from '@/components/research-note/ai/settings'
import { useCloudNotebook } from '@/components/research-note/state/useCloudNotebook'
import { CommentsModal } from '@/components/research-note/features/collab/CommentsModal'
import { canEdit } from '@/components/research-note/features/collab/permissions'
import { ELNPanel } from '@/components/research-note/features/eln/ELNPanel'
import { CloudSaveProvider } from '@/components/research-note/features/sync/CloudSave'
import { assembleAllCaptured } from '@/components/research-note/ai/formatting'
import { exportDraft } from '@/components/research-note/features/export/exporters'

const DataWorkspace = lazy(() =>
  import('@/components/research-note/features/data/DataWorkspace').then((m) => ({ default: m.DataWorkspace })),
)
const OutputWorkspace = lazy(() =>
  import('@/components/research-note/features/ai-output/OutputWorkspace').then((m) => ({
    default: m.OutputWorkspace,
  })),
)
const ProgressReportsWorkspace = lazy(() =>
  import('@/components/research-note/features/progress/ProgressReportsWorkspace').then((m) => ({
    default: m.ProgressReportsWorkspace,
  })),
)

const TAB_ICONS: Record<AiDraftTabKey, ComponentType<{ className?: string }>> = {
  notes: NotebookIcon,
  data: TableIcon,
  images: ImageIcon,
  eln: FlaskIcon,
  progressReports: ProgressIcon,
  publication: ManuscriptIcon,
}

/**
 * Single AI Drafts workspace: Materials (notes), data, figures, lab log, and drafts.
 */
export function NotebookView({
  projectId,
  settings,
  author,
  onBack,
}: {
  projectId: string
  settings: AISettings
  author: string
  onBack: () => void
}) {
  const [draftTab, setDraftTab] = useState<AiDraftTabKey>('notes')
  const [pendingNewNote, setPendingNewNote] = useState(0)
  const [exportingCaptured, setExportingCaptured] = useState(false)
  const [capturedError, setCapturedError] = useState<string | null>(null)
  const [guideDismissed, setGuideDismissed] = useState<Partial<Record<AiDraftTabKey, boolean>>>({})
  const cloud = useCloudNotebook(projectId)

  const canWrite = canEdit('owner')
  const TabIcon = TAB_ICONS[draftTab]
  const showGuide = !guideDismissed[draftTab]

  const requestNewNote = () => {
    setDraftTab('notes')
    setPendingNewNote((n) => n + 1)
  }

  const onGenerateAllCapturedPdf = async () => {
    if (exportingCaptured) return
    setExportingCaptured(true)
    setCapturedError(null)
    try {
      await cloud.saveNow()
      const captured = await assembleAllCaptured(projectId)
      if (!captured.trim()) {
        setCapturedError(
          'Nothing captured yet — add content in Materials, Data, Figures, Lab Log, reports, or manuscript sections.',
        )
        return
      }
      await exportDraft('pdf', 'All-Captured', captured)
    } catch (err) {
      setCapturedError(
        err instanceof Error ? err.message : 'Could not generate captured PDF.',
      )
    } finally {
      setExportingCaptured(false)
    }
  }

  if (!cloud.ready) {
    return (
      <div className="rn-workspace-loading">
        <div className="rn-workspace-loading-card" role="status">
          <NotebookIcon className="h-6 w-6" />
          <p>Opening notebook…</p>
        </div>
      </div>
    )
  }

  return (
    <CloudSaveProvider
      value={{
        saveNow: cloud.saveNow,
        saving: cloud.saving,
        statusLabel: cloud.statusLabel,
        error: cloud.error,
        lastSaved: cloud.lastSaved,
      }}
    >
      <div className="rn-workspace">
        <header className="rn-workspace-topbar">
          <div className="rn-workspace-topbar-start">
            <button type="button" onClick={onBack} className="rn-workspace-back">
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Library</span>
            </button>
            <div className="rn-workspace-title-block">
              <p className="rn-workspace-eyebrow">Research Note</p>
              <ProjectTitle projectId={projectId} />
            </div>
          </div>

          <div className="rn-workspace-topbar-actions">
            <span
              className={`rn-workspace-save-status${cloud.error ? ' is-error' : ''}`}
              title={cloud.error ?? undefined}
            >
              <SaveIcon className="h-3.5 w-3.5" />
              {cloud.error ? 'Save error' : cloud.statusLabel}
            </span>
            <button
              type="button"
              onClick={() => void cloud.saveNow()}
              disabled={cloud.saving}
              className="rn-workspace-btn rn-workspace-btn-ghost"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              {cloud.saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>

        {capturedError && (
          <p className="rn-workspace-alert" role="alert">
            {capturedError}
          </p>
        )}

        <nav className="rn-workspace-topnav" aria-label="Notebook areas">
          {AI_DRAFT_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.id} className="rn-workspace-topnav-group">
              {groupIndex > 0 && <span className="rn-workspace-topnav-divider" aria-hidden />}
              {group.label ? (
                <span className="rn-workspace-topnav-label">{group.label}</span>
              ) : null}
              <ul className="rn-workspace-topnav-list">
                {group.keys.map((key) => {
                  const Icon = TAB_ICONS[key]
                  const active = draftTab === key
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => setDraftTab(key)}
                        className={`rn-workspace-topnav-item${active ? ' is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        title={AI_DRAFT_HINTS[key]}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        <span>{AI_DRAFT_TABS[key]}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void onGenerateAllCapturedPdf()}
            disabled={exportingCaptured}
            className="rn-workspace-topnav-download"
            title="Download Materials, Data, Figures, Lab Log, reports, and filled manuscript sections as one PDF"
          >
            <DownloadIcon className="h-3.5 w-3.5" aria-hidden />
            <span>{exportingCaptured ? 'Preparing…' : 'Compile Notebook'}</span>
          </button>
        </nav>

        <div className="rn-workspace-body">
          <div className="rn-workspace-main">
            <div className="rn-workspace-panel-head">
              <div className="rn-workspace-panel-identity">
                <span className="rn-workspace-panel-icon" aria-hidden>
                  <TabIcon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="rn-workspace-panel-title">{AI_DRAFT_TABS[draftTab]}</h2>
                  <p className="rn-workspace-panel-lead">{AI_DRAFT_HINTS[draftTab]}</p>
                </div>
              </div>
              {draftTab === 'notes' && canWrite && (
                <button
                  type="button"
                  onClick={requestNewNote}
                  className="rn-workspace-btn rn-workspace-btn-primary"
                >
                  <PlusIcon className="h-4 w-4" />
                  New note
                </button>
              )}
            </div>

            {showGuide && (
              <div className="rn-workspace-guide" role="note">
                <LightbulbIcon className="rn-workspace-guide-icon" />
                <p>{AI_DRAFT_GUIDES[draftTab]}</p>
                <button
                  type="button"
                  className="rn-workspace-guide-dismiss"
                  aria-label="Dismiss tip"
                  onClick={() =>
                    setGuideDismissed((prev) => ({ ...prev, [draftTab]: true }))
                  }
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="rn-workspace-panel-body">
              {draftTab === 'notes' ? (
                <NotesTab
                  projectId={projectId}
                  canWrite={canWrite}
                  author={author}
                  pendingNewNote={pendingNewNote}
                />
              ) : draftTab === 'data' ? (
                <LazyTab>
                  <DataWorkspace projectId={projectId} />
                </LazyTab>
              ) : draftTab === 'images' ? (
                <FiguresGallery
                  projectId={projectId}
                  canWrite={canWrite}
                  onOpenNotes={requestNewNote}
                />
              ) : draftTab === 'eln' ? (
                <ELNPanel projectId={projectId} canWrite={canWrite} author={author} />
              ) : draftTab === 'progressReports' ? (
                <LazyTab>
                  <ProgressReportsWorkspace
                    projectId={projectId}
                    settings={settings}
                    canWrite={canWrite}
                    author={author}
                  />
                </LazyTab>
              ) : (
                <LazyTab>
                  <OutputWorkspace
                    key={draftTab}
                    projectId={projectId}
                    settings={settings}
                    canWrite={canWrite}
                    author={author}
                    outputType={draftTab as OutputTabKey}
                  />
                </LazyTab>
              )}
            </div>
          </div>
        </div>
      </div>
    </CloudSaveProvider>
  )
}

function LazyTab({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="rn-workspace-loading rn-workspace-loading-inline">
          <p>Loading…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProjectTitle({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('…')
  useEffect(() => {
    let alive = true
    getProject(projectId).then((p) => {
      if (alive && p) setTitle(p.title)
    })
    return () => {
      alive = false
    }
  }, [projectId])
  return <h1 className="rn-workspace-project-title">{title}</h1>
}

function NotesTab({
  projectId,
  canWrite,
  author,
  pendingNewNote = 0,
}: {
  projectId: string
  canWrite: boolean
  author: string
  /** Incremented by parent to request creating a new note page. */
  pendingNewNote?: number
}) {
  const nb = useNotebook(projectId)
  const editorApiRef = useRef<EditorApi | null>(null)
  const docxInputRef = useRef<HTMLInputElement>(null)
  const [showComments, setShowComments] = useState(false)
  const lastPending = useRef(0)

  const handleSave = useMemo(
    () => (pageId: string, doc: RichTextDoc) => {
      void nb.savePageContent(pageId, doc)
    },
    [nb.savePageContent], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const quickStart = async () => {
    const section = await nb.addSection('Notes')
    await nb.addPage(section.id, 'Untitled page')
  }

  const addNote = async () => {
    if (!canWrite || nb.loading) return
    if (nb.sections.length === 0) {
      await quickStart()
      return
    }
    const sectionId = nb.activePage?.sectionId ?? nb.sections[0]!.id
    await nb.addPage(sectionId, 'Untitled page')
  }

  useEffect(() => {
    if (!pendingNewNote || pendingNewNote === lastPending.current) return
    if (nb.loading) return
    lastPending.current = pendingNewNote
    void addNote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNewNote, nb.loading])

  const onImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const page = nb.activePage
    if (!file || !page) return
    if (!isDocx(file)) {
      window.alert('Please choose a .docx file. Legacy .doc files aren’t supported — open it in Word and “Save As” .docx first.')
      return
    }
    const hasContent = (page.content?.content?.length ?? 0) > 0
    if (hasContent && !window.confirm('Replace this page’s content with the imported document?')) {
      return
    }
    const html = await importDocxToHtml(file)
    editorApiRef.current?.setContentHTML(html)
    void nb.renamePage(page.id, file.name.replace(/\.docx$/i, ''))
  }

  const onExportDocx = async () => {
    const page = nb.activePage
    if (!page) return
    const json = editorApiRef.current?.getJSON() ?? page.content
    await exportDocToDocx(json, page.title || 'document')
  }

  if (nb.loading) {
    return (
      <div className="rn-workspace-loading rn-workspace-loading-inline">
        <p>Loading materials…</p>
      </div>
    )
  }

  return (
    <div className="rn-notes-layout">
      <SectionRail
        sections={nb.sections}
        pages={nb.pages}
        activePageId={nb.activePageId}
        readOnly={!canWrite}
        onSelectPage={nb.setActivePageId}
        onAddSection={() => void nb.addSection()}
        onRenameSection={(id, t) => void nb.renameSection(id, t)}
        onRemoveSection={(id) => void nb.removeSection(id)}
        onAddPage={(sid) => void nb.addPage(sid)}
        onRenamePage={(id, t) => void nb.renamePage(id, t)}
        onRemovePage={(id) => void nb.removePage(id)}
      />

      <main className="rn-notes-editor">
        {nb.activePage ? (
          <>
            <input
              ref={docxInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onImportDocx}
            />
            <div className="rn-notes-editor-toolbar">
              <PageTitle
                key={nb.activePage.id}
                page={nb.activePage}
                onRename={nb.renamePage}
                readOnly={!canWrite}
              />
              <div className="rn-notes-editor-actions">
                <button
                  type="button"
                  onClick={() => setShowComments(true)}
                  className="rn-workspace-btn rn-workspace-btn-ghost"
                >
                  <CommentIcon className="h-3.5 w-3.5" />
                  Comments
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => docxInputRef.current?.click()}
                    className="rn-workspace-btn rn-workspace-btn-ghost"
                  >
                    <ImportIcon className="h-3.5 w-3.5" />
                    Import
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onExportDocx()}
                  className="rn-workspace-btn rn-workspace-btn-ghost"
                >
                  <ExportIcon className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            </div>
            <div className="rn-notes-editor-body">
              <Editor
                key={nb.activePage.id}
                pageId={nb.activePage.id}
                projectId={projectId}
                initialContent={nb.activePage.content}
                onSave={handleSave}
                onReady={(api) => (editorApiRef.current = api)}
                editable={canWrite}
              />
            </div>
            <CommentsModal
              open={showComments}
              onClose={() => setShowComments(false)}
              projectId={projectId}
              targetKind="page"
              targetId={nb.activePage.id}
              targetLabel={nb.activePage.title || 'Untitled page'}
              author={author}
            />
          </>
        ) : nb.sections.length === 0 ? (
          <NotebookEmptyState onQuickStart={() => void quickStart()} />
        ) : (
          <div className="rn-notes-empty-select">
            <InfoIcon className="h-5 w-5" />
            <p>Select a page from the left, or add one to keep capturing materials.</p>
          </div>
        )}
      </main>
    </div>
  )
}

/** Debounced, always-editable page title above the editor. */
function PageTitle({
  page,
  onRename,
  readOnly,
}: {
  page: Page
  onRename: (id: string, title: string) => void
  readOnly?: boolean
}) {
  const [value, setValue] = useState(page.title)
  const save = useMemo(
    () =>
      debounce(
        (t: string) => onRename(page.id, t.trim() || 'Untitled page'),
        500,
      ),
    [page.id, onRename],
  )
  useEffect(() => () => save.flush(), [save])

  return (
    <input
      value={value}
      readOnly={readOnly}
      onChange={(e) => {
        if (readOnly) return
        setValue(e.target.value)
        save(e.target.value)
      }}
      placeholder="Untitled page"
      aria-label="Page title"
      className="rn-notes-page-title"
    />
  )
}

function NotebookEmptyState({ onQuickStart }: { onQuickStart: () => void }) {
  return (
    <div className="rn-empty-panel">
      <div className="rn-empty-panel-icon" aria-hidden>
        <NotebookIcon className="h-7 w-7" />
      </div>
      <h2>Start capturing materials</h2>
      <p>
        Create your first note for readings, quotes, and working ideas. Everything you capture here
        can later feed Progress Reports and the Manuscript.
      </p>
      <ol className="rn-empty-steps">
        <li>Add a note for each source or theme</li>
        <li>Paste quotes and annotate as you go</li>
        <li>Move to Data, Figures, or Lab Log when you have evidence</li>
      </ol>
      <button type="button" onClick={onQuickStart} className="rn-workspace-btn rn-workspace-btn-primary">
        <PlusIcon className="h-4 w-4" />
        Create first note
      </button>
    </div>
  )
}
