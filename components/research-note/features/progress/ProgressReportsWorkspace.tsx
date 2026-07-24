import { useEffect, useMemo, useState } from 'react'
import type { AISettings } from '@/components/research-note/ai/settings'
import { CommentsModal } from '@/components/research-note/features/collab/CommentsModal'
import {
  EXPORT_LABELS,
  exportDraft,
  type ExportFormat,
} from '@/components/research-note/features/export/exporters'
import { DraftDocumentEditor } from '@/components/research-note/features/ai-output/DraftDocumentEditor'
import {
  composeProgressNarrative,
  healthLabel,
  type ProgressActivityKind,
} from '@/components/research-note/features/progress/progressMetrics'
import type {
  MilestoneStatus,
  ProgressHealth,
} from '@/components/research-note/features/progress/progressTracker'
import { WorkspaceSaveButton, useCloudSave } from '@/components/research-note/features/sync/CloudSave'
import {
  ClockIcon,
  CloseIcon,
  CommentIcon,
  ExportIcon,
  FlaskIcon,
  ImageIcon,
  InfoIcon,
  LightbulbIcon,
  ManuscriptIcon,
  NotebookIcon,
  PlusIcon,
  ProgressIcon,
  ReportIcon,
  TableIcon,
  TargetIcon,
  TrashIcon,
} from '@/components/research-note/components/icons'
import { relativeTime } from '@/components/research-note/lib/format'
import { draftContentToMarkdown } from '@/components/research-note/lib/markdown'
import { useDrafts } from '@/components/research-note/state/useDrafts'
import { useProgressTracker } from '@/components/research-note/state/useProgressTracker'

const EXPORT_FORMATS = Object.keys(EXPORT_LABELS) as ExportFormat[]

const HEALTH_OPTIONS: { id: ProgressHealth; label: string }[] = [
  { id: 'on_track', label: 'On track' },
  { id: 'at_risk', label: 'At risk' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'completed', label: 'Completed' },
]

const MILESTONE_STATUSES: { id: MilestoneStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' },
]

const ACTIVITY_ICONS: Record<ProgressActivityKind, typeof FlaskIcon> = {
  lab: FlaskIcon,
  material: NotebookIcon,
  data: TableIcon,
  figure: ImageIcon,
  draft: ManuscriptIcon,
  milestone: TargetIcon,
}

/** Dedicated Progress Reports workspace: % complete, work done, logs, milestones. */
export function ProgressReportsWorkspace({
  projectId,
  settings,
  canWrite,
  author,
}: {
  projectId: string
  settings: AISettings
  canWrite: boolean
  author: string
}) {
  const drafts = useDrafts(projectId, settings)
  const progress = useProgressTracker(projectId)
  const cloud = useCloudSave()
  const [showExport, setShowExport] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [composing, setComposing] = useState(false)
  const [guideOpen, setGuideOpen] = useState(true)
  const [filterKind, setFilterKind] = useState<ProgressActivityKind | 'all'>('all')

  const draft = drafts.getDraft('progressReports', null)
  const slotKey = drafts.slot('progressReports', null)
  const snapshot = progress.snapshot

  useEffect(() => {
    if (!canWrite || drafts.loading) return
    if (drafts.getDraft('progressReports', null)) return
    void drafts.addBlank('progressReports', null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, drafts.loading, draft?.id])

  const filteredActivity = useMemo(() => {
    const items = snapshot?.activity ?? []
    if (filterKind === 'all') return items
    return items.filter((a) => a.kind === filterKind)
  }, [snapshot?.activity, filterKind])

  const onComposeNarrative = async () => {
    if (!canWrite || !snapshot || composing) return
    setComposing(true)
    try {
      const md = composeProgressNarrative(snapshot, progress.tracker)
      const html = markdownToSimpleHtml(md)
      drafts.editDraft('progressReports', null, html)
      await drafts.flushPending()
      await cloud.saveNow()
      await progress.refreshSnapshot()
    } finally {
      setComposing(false)
    }
  }

  const onExport = async (format: ExportFormat) => {
    setShowExport(false)
    if (!draft?.content) return
    await exportDraft(format, 'Progress-Report', draftContentToMarkdown(draft.content))
  }

  if (progress.loading || drafts.loading || !snapshot) {
    return (
      <div className="rn-workspace-loading rn-workspace-loading-inline">
        <p>Loading progress report…</p>
      </div>
    )
  }

  return (
    <div className="rn-progress">
      {guideOpen && (
        <div className="rn-workspace-guide rn-progress-guide" role="note">
          <LightbulbIcon className="rn-workspace-guide-icon" />
          <p>
            Progress is calculated live from Materials, Data, Figures, Lab Log,
            Manuscript sections, and your milestones. Update status and blockers, then compose a
            narrative for supervisors.
          </p>
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

      {(progress.error || drafts.error) && (
        <p className="rn-workspace-alert" role="alert">
          {progress.error || drafts.error}
        </p>
      )}

      <div className="rn-progress-toolbar">
        <div className="rn-progress-toolbar-copy">
          <ProgressIcon className="h-4 w-4" />
          <div>
            <h3>Progress intelligence</h3>
            <p>
              {snapshot.lastUpdated
                ? `Last notebook activity ${relativeTime(snapshot.lastUpdated)}`
                : 'No activity yet'}
              {progress.saving ? ' · Saving tracker…' : ''}
            </p>
          </div>
        </div>
        <div className="rn-progress-toolbar-actions">
          <button
            type="button"
            className="rn-workspace-btn rn-workspace-btn-ghost"
            onClick={() => void progress.refreshSnapshot()}
          >
            Refresh metrics
          </button>
          {canWrite && (
            <button
              type="button"
              className="rn-workspace-btn rn-workspace-btn-primary"
              disabled={composing}
              onClick={() => void onComposeNarrative()}
            >
              <ReportIcon className="h-3.5 w-3.5" />
              {composing ? 'Composing…' : 'Compose narrative'}
            </button>
          )}
          {canWrite && (
            <WorkspaceSaveButton
              label="Save progress"
              onBeforeSave={async () => {
                await progress.saveNow()
                await drafts.flushPending()
              }}
              className="rn-workspace-btn rn-workspace-btn-ghost"
            />
          )}
          <div className="rn-output-export">
            <button
              type="button"
              className="rn-workspace-btn rn-workspace-btn-ghost"
              disabled={!draft?.content}
              onClick={() => setShowExport((v) => !v)}
            >
              <ExportIcon className="h-3.5 w-3.5" />
              Export
            </button>
            {showExport && (
              <div className="rn-output-export-menu" onMouseLeave={() => setShowExport(false)}>
                {EXPORT_FORMATS.map((f) => (
                  <button key={f} type="button" onClick={() => void onExport(f)}>
                    {EXPORT_LABELS[f]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="rn-workspace-btn rn-workspace-btn-ghost"
            onClick={() => setShowComments(true)}
          >
            <CommentIcon className="h-3.5 w-3.5" />
            Comments
          </button>
        </div>
      </div>

      <div className="rn-progress-layout">
        <aside className="rn-progress-side">
          <section className="rn-progress-card rn-progress-hero">
            <div className="rn-progress-ring" style={{ ['--p' as string]: `${snapshot.percent}` }}>
              <span>{snapshot.percent}%</span>
            </div>
            <div>
              <p className="rn-progress-hero-label">Overall progress</p>
              <p className={`rn-progress-health is-${progress.tracker.health}`}>
                {healthLabel(progress.tracker.health)}
              </p>
              <p className="rn-progress-hero-meta">
                Manuscript {snapshot.manuscriptFilled}/{snapshot.manuscriptTotal} · Milestones{' '}
                {snapshot.milestoneDone}/{snapshot.milestoneTotal || 0}
              </p>
            </div>
          </section>

          <section className="rn-progress-card">
            <h4>Status</h4>
            <div className="rn-progress-health-grid">
              {HEALTH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!canWrite}
                  className={`rn-progress-health-chip is-${opt.id}${
                    progress.tracker.health === opt.id ? ' is-active' : ''
                  }`}
                  onClick={() => progress.setHealth(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rn-progress-card">
            <h4>Reporting period</h4>
            <div className="rn-progress-period">
              <label>
                From
                <input
                  type="date"
                  value={progress.tracker.periodStart}
                  disabled={!canWrite}
                  onChange={(e) =>
                    progress.setPeriod(e.target.value, progress.tracker.periodEnd)
                  }
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={progress.tracker.periodEnd}
                  disabled={!canWrite}
                  onChange={(e) =>
                    progress.setPeriod(progress.tracker.periodStart, e.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="rn-progress-card">
            <h4>Coverage breakdown</h4>
            <ul className="rn-progress-buckets">
              {snapshot.buckets.map((b) => (
                <li key={b.key}>
                  <div className="rn-progress-bucket-head">
                    <span>{b.label}</span>
                    <span>{Math.round(b.ratio * 100)}%</span>
                  </div>
                  <div className="rn-progress-bar" aria-hidden>
                    <span style={{ width: `${Math.round(b.ratio * 100)}%` }} />
                  </div>
                  <p>{b.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="rn-progress-main">
          <section className="rn-progress-card">
            <div className="rn-progress-section-head">
              <h4>Work done so far</h4>
              <InfoIcon className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            </div>
            <textarea
              value={progress.tracker.summary}
              disabled={!canWrite}
              rows={3}
              placeholder="Summarise accomplishments this period (auto-filled items appear below)."
              onChange={(e) => progress.setSummary(e.target.value)}
              className="rn-progress-textarea"
            />
            <ul className="rn-progress-checklist">
              {snapshot.workDone.length === 0 ? (
                <li className="is-empty">Nothing captured yet — start in Materials or Lab Log.</li>
              ) : (
                snapshot.workDone.map((item) => (
                  <li key={item}>
                    <span className="rn-progress-check" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))
              )}
            </ul>
          </section>

          <div className="rn-progress-split">
            <section className="rn-progress-card">
              <h4>Blockers</h4>
              <textarea
                value={progress.tracker.blockers}
                disabled={!canWrite}
                rows={4}
                placeholder="What is blocking progress? Equipment, ethics, data access…"
                onChange={(e) => progress.setBlockers(e.target.value)}
                className="rn-progress-textarea"
              />
            </section>
            <section className="rn-progress-card">
              <h4>Next steps</h4>
              <textarea
                value={progress.tracker.nextSteps}
                disabled={!canWrite}
                rows={4}
                placeholder="Planned actions for the next reporting period…"
                onChange={(e) => progress.setNextSteps(e.target.value)}
                className="rn-progress-textarea"
              />
            </section>
          </div>

          <section className="rn-progress-card">
            <div className="rn-progress-section-head">
              <h4>Milestones</h4>
              {canWrite && (
                <button
                  type="button"
                  className="rn-workspace-btn rn-workspace-btn-ghost"
                  onClick={() => progress.addMilestone()}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add milestone
                </button>
              )}
            </div>
            {progress.tracker.milestones.length === 0 ? (
              <p className="rn-progress-empty">
                Add milestones to track deliverables. Completed milestones raise your progress %.
              </p>
            ) : (
              <ul className="rn-progress-milestones">
                {progress.tracker.milestones.map((m) => (
                  <li key={m.id} className={`is-${m.status}`}>
                    <input
                      value={m.title}
                      disabled={!canWrite}
                      onChange={(e) => progress.updateMilestone(m.id, { title: e.target.value })}
                      className="rn-progress-milestone-title"
                      aria-label="Milestone title"
                    />
                    <select
                      value={m.status}
                      disabled={!canWrite}
                      onChange={(e) =>
                        progress.setMilestoneStatus(m.id, e.target.value as MilestoneStatus)
                      }
                      aria-label="Milestone status"
                    >
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={m.dueDate}
                      disabled={!canWrite}
                      onChange={(e) => progress.updateMilestone(m.id, { dueDate: e.target.value })}
                      aria-label="Due date"
                    />
                    <input
                      value={m.notes}
                      disabled={!canWrite}
                      placeholder="Notes"
                      onChange={(e) => progress.updateMilestone(m.id, { notes: e.target.value })}
                      className="rn-progress-milestone-notes"
                      aria-label="Milestone notes"
                    />
                    {canWrite && (
                      <button
                        type="button"
                        className="rn-progress-milestone-remove"
                        title="Remove milestone"
                        aria-label={`Remove ${m.title}`}
                        onClick={() => progress.removeMilestone(m.id)}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rn-progress-card">
            <div className="rn-progress-section-head">
              <h4>Activity log</h4>
              <div className="rn-progress-filters">
                {(
                  [
                    ['all', 'All'],
                    ['lab', 'Lab'],
                    ['material', 'Materials'],
                    ['data', 'Data'],
                    ['figure', 'Figures'],
                    ['draft', 'Drafts'],
                    ['milestone', 'Milestones'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rn-progress-filter${filterKind === id ? ' is-active' : ''}`}
                    onClick={() => setFilterKind(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredActivity.length === 0 ? (
              <p className="rn-progress-empty">No matching activity yet.</p>
            ) : (
              <ol className="rn-progress-activity">
                {filteredActivity.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.kind]
                  return (
                    <li key={item.id}>
                      <span className="rn-progress-activity-icon" aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="rn-progress-activity-title">{item.title}</p>
                        <p className="rn-progress-activity-detail">{item.detail}</p>
                      </div>
                      <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>
                        <ClockIcon className="h-3 w-3" />
                        {relativeTime(item.at)}
                      </time>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section className="rn-progress-card rn-progress-lab">
            <div className="rn-progress-section-head">
              <h4>Lab Log digest</h4>
              <span className="rn-progress-count">{snapshot.labEntries.length}</span>
            </div>
            {snapshot.labEntries.length === 0 ? (
              <p className="rn-progress-empty">
                Lab Log entries appear here automatically once you log experiments.
              </p>
            ) : (
              <ul className="rn-progress-lab-list">
                {snapshot.labEntries.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <div>
                      <strong>{e.author}</strong>
                      <span>· {new Date(e.timestamp).toLocaleString()} · {relativeTime(e.timestamp)}</span>
                    </div>
                    <p>{e.text.trim() || '(image-only entry)'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rn-progress-card rn-progress-narrative">
            <div className="rn-progress-section-head">
              <h4>Progress narrative</h4>
              <p className="rn-progress-narrative-hint">
                Editable report body. Use Compose narrative to rebuild from live metrics and logs.
              </p>
            </div>
            <div className="rn-progress-editor">
              {canWrite || draft ? (
                <DraftDocumentEditor
                  key={draft?.id ?? 'progress-blank'}
                  content={draft?.content ?? ''}
                  onChange={(html) => drafts.editDraft('progressReports', null, html)}
                  editable={canWrite}
                />
              ) : (
                <p className="rn-progress-empty">View-only — ask an editor to open this report.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <CommentsModal
        open={showComments}
        onClose={() => setShowComments(false)}
        projectId={projectId}
        targetKind="draft"
        targetId={slotKey}
        targetLabel="Progress Reports"
        author={author}
      />
    </div>
  )
}

/** Lightweight Markdown → HTML for TipTap seed content. */
function markdownToSimpleHtml(md: string): string {
  const blocks = md.split(/\n\n+/)
  return blocks
    .map((block) => {
      const lines = block.split('\n')
      if (lines[0]?.startsWith('# ')) {
        return `<h1>${escapeHtml(lines[0].slice(2))}</h1>${lines
          .slice(1)
          .map((l) => inlineMd(l))
          .join('<br/>')}`
      }
      if (lines.every((l) => l.startsWith('- ') || l.startsWith('- ['))) {
        const items = lines
          .map((l) => {
            const text = l.replace(/^- \[[ x]\]\s*/i, '').replace(/^- /, '')
            return `<li>${inlineMd(text)}</li>`
          })
          .join('')
        return `<ul>${items}</ul>`
      }
      if (lines[0]?.startsWith('## ')) {
        return `<h2>${escapeHtml(lines[0].slice(3))}</h2>${lines
          .slice(1)
          .map((l) => inlineMd(l))
          .join('<br/>')}`
      }
      return `<p>${lines.map((l) => inlineMd(l)).join('<br/>')}</p>`
    })
    .join('')
}

function inlineMd(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
