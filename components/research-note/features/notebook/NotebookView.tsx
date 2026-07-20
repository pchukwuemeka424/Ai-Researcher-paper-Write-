import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  AI_DRAFT_TABS,
  type AiDraftTabKey,
  type OutputTabKey,
} from '@/components/research-note/config/branding'
import { useNotebook } from '@/components/research-note/state/useNotebook'
import { getProject } from '@/components/research-note/storage/repositories'
import { debounce } from '@/components/research-note/lib/debounce'
import { ArrowLeftIcon, PlusIcon } from '@/components/research-note/components/icons'
import type { Page, RichTextDoc } from '@/components/research-note/storage/types'
import { Editor, type EditorApi } from './Editor'
import { SectionRail } from './SectionRail'
import { FiguresGallery } from './FiguresGallery'
import { exportDocToDocx, importDocxToHtml, isDocx } from './docxIO'
import type { AISettings } from '@/components/research-note/ai/settings'
import { useCloudNotebook } from '@/components/research-note/state/useCloudNotebook'
import { ShareModal } from '@/components/research-note/features/collab/ShareModal'
import { CommentsModal } from '@/components/research-note/features/collab/CommentsModal'
import { canEdit, type EffectiveRole } from '@/components/research-note/features/collab/permissions'
import { ELNPanel } from '@/components/research-note/features/eln/ELNPanel'
import { ResearchChat } from '@/components/research-note/features/chat/ResearchChat'
import { CloudSaveProvider } from '@/components/research-note/features/sync/CloudSave'

const DataWorkspace = lazy(() =>
  import('@/components/research-note/features/data/DataWorkspace').then((m) => ({ default: m.DataWorkspace })),
)
const OutputWorkspace = lazy(() =>
  import('@/components/research-note/features/ai-output/OutputWorkspace').then((m) => ({
    default: m.OutputWorkspace,
  })),
)

/**
 * Single AI Drafts workspace: Materials (notes), data, figures, lab log, and drafts.
 */
export function NotebookView({
  projectId,
  settings,
  author,
  onBack,
  onOpenAISearch,
}: {
  projectId: string
  settings: AISettings
  author: string
  onBack: () => void
  onOpenAISearch: () => void
}) {
  const [draftTab, setDraftTab] = useState<AiDraftTabKey>('notes')
  const [showShare, setShowShare] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [role, setRole] = useState<EffectiveRole>('owner')
  const [pendingNewNote, setPendingNewNote] = useState(0)
  const cloud = useCloudNotebook(projectId)

  const canWrite = canEdit(role)

  const requestNewNote = () => {
    setDraftTab('notes')
    setPendingNewNote((n) => n + 1)
  }

  if (!cloud.ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Loading notebook from cloud…
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
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
        >
          <ArrowLeftIcon /> Dashboard
        </button>
        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />
        <ProjectTitle projectId={projectId} />
        <span className="ml-2 hidden text-xs font-medium text-[var(--color-muted)] sm:inline">
          AI Drafts
        </span>

        <div className="ml-auto flex items-center gap-3">
          <nav className="flex flex-wrap items-center gap-1">
            {(Object.entries(AI_DRAFT_TABS) as [AiDraftTabKey, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDraftTab(key)}
                  className={[
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    draftTab === key
                      ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
                  ].join(' ')}
                >
                  {label}
                </button>
              ),
            )}
          </nav>

          {draftTab === 'notes' && canWrite && (
            <button
              type="button"
              onClick={requestNewNote}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--color-brand)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-ink)]"
            >
              <PlusIcon className="h-3.5 w-3.5" /> New note
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3 text-xs">
            <span className="text-[var(--color-muted)]" title={cloud.error ?? undefined}>
              {cloud.error ? 'Save error' : cloud.statusLabel}
            </span>
            <button
              type="button"
              onClick={() => void cloud.saveNow()}
              disabled={cloud.saving}
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)] disabled:opacity-50"
            >
              {cloud.saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)]"
            >
              Ask
            </button>
            <button
              type="button"
              onClick={onOpenAISearch}
              title="Search with AI"
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)]"
            >
              Web
            </button>
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)]"
            >
              Share
            </button>
            {role !== 'owner' && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium uppercase text-amber-700" title="You are previewing as a collaborator">
                {role === 'view' ? 'View-only' : 'Editor'}
              </span>
            )}
          </div>
        </div>
      </header>

      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        projectId={projectId}
        effectiveRole={role}
        onChangeEffectiveRole={setRole}
      />

      <div className="flex min-h-0 flex-1">
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

      <ResearchChat
        open={showChat}
        onClose={() => setShowChat(false)}
        projectId={projectId}
      />
    </div>
    </CloudSaveProvider>
  )
}

function LazyTab({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
          Loading…
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
  return <h1 className="truncate text-sm font-semibold">{title}</h1>
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
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
        Loading notebook…
      </div>
    )
  }

  return (
    <>
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

      <main className="flex min-w-0 flex-1 flex-col bg-[var(--color-canvas)]">
        {nb.activePage ? (
          <>
            <input
              ref={docxInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onImportDocx}
            />
            <div className="flex w-full items-start gap-2 px-6 pt-6 sm:px-8">
              <PageTitle
                key={nb.activePage.id}
                page={nb.activePage}
                onRename={nb.renamePage}
                readOnly={!canWrite}
              />
              <div className="flex shrink-0 gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComments(true)}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                >
                  Comments
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => docxInputRef.current?.click()}
                    className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                  >
                    Import .docx
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onExportDocx()}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
                >
                  Export .docx
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
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
          <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
            Select a page, or add one from the left.
          </div>
        )}
      </main>
    </>
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
      className="w-full border-none bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-[var(--color-muted)]"
    />
  )
}

function NotebookEmptyState({ onQuickStart }: { onQuickStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-semibold">This notebook is empty</h2>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
        Create your first note to start capturing research. Changes sync to your
        GAHI account automatically.
      </p>
      <button
        type="button"
        onClick={onQuickStart}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
      >
        <PlusIcon /> Create first note
      </button>
    </div>
  )
}
