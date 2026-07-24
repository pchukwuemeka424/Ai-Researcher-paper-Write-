import { PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import { draftContentToPlainText } from '@/components/research-note/lib/markdown'
import { relativeTime } from '@/components/research-note/lib/format'
import {
  listAssets,
  listDatasets,
  listDrafts,
  listLabEntries,
  listPages,
} from '@/components/research-note/storage/repositories'
import type { Draft, LabEntry } from '@/components/research-note/storage/types'
import {
  PROGRESS_TRACKER_SECTION,
  type ProgressHealth,
  type ProgressMilestone,
  type ProgressTracker,
} from './progressTracker'

export type ProgressBucketKey =
  | 'materials'
  | 'data'
  | 'figures'
  | 'labLog'
  | 'manuscript'
  | 'milestones'

export type ProgressBucket = {
  key: ProgressBucketKey
  label: string
  group: 'capture' | 'write' | 'plan'
  weight: number
  /** 0–1 completion for this bucket. */
  ratio: number
  detail: string
  count: number
  total?: number
}

export type ProgressActivityKind =
  | 'lab'
  | 'material'
  | 'data'
  | 'figure'
  | 'draft'
  | 'milestone'

export type ProgressActivityItem = {
  id: string
  kind: ProgressActivityKind
  title: string
  detail: string
  at: string
}

export type NotebookProgressSnapshot = {
  percent: number
  buckets: ProgressBucket[]
  workDone: string[]
  remaining: string[]
  activity: ProgressActivityItem[]
  labEntries: LabEntry[]
  manuscriptFilled: number
  manuscriptTotal: number
  milestoneDone: number
  milestoneTotal: number
  lastUpdated: string | null
}

const WEIGHTS: Record<ProgressBucketKey, number> = {
  materials: 15,
  data: 15,
  figures: 10,
  labLog: 15,
  manuscript: 35,
  milestones: 10,
}

function hasDraftText(content: string | undefined | null): boolean {
  if (!content) return false
  return Boolean(draftContentToPlainText(content).trim())
}

function pageHasContent(page: { content: { content?: unknown[] } | null }): boolean {
  return (page.content?.content?.length ?? 0) > 0
}

/** Build a live progress snapshot from notebook capture + write surfaces. */
export async function computeNotebookProgress(
  projectId: string,
  tracker: ProgressTracker | null,
): Promise<NotebookProgressSnapshot> {
  const [pages, datasets, assets, labEntries, drafts] = await Promise.all([
    listPages(projectId),
    listDatasets(projectId),
    listAssets(projectId),
    listLabEntries(projectId),
    listDrafts(projectId),
  ])

  const filledPages = pages.filter(pageHasContent)
  const progressNarrative = drafts.find(
    (d) => d.outputType === 'progressReports' && d.section === null,
  )
  const manuscriptDrafts = drafts.filter((d) => d.outputType === 'publication')
  const filledSections = PUBLICATION_SECTIONS.filter((sec) =>
    hasDraftText(manuscriptDrafts.find((d) => d.section === sec)?.content),
  )

  const milestones = tracker?.milestones ?? []
  const milestoneDone = milestones.filter((m) => m.status === 'done').length
  const milestoneRatio = milestones.length === 0 ? 0 : milestoneDone / milestones.length

  const buckets: ProgressBucket[] = [
    {
      key: 'materials',
      label: 'Materials',
      group: 'capture',
      weight: WEIGHTS.materials,
      ratio: filledPages.length > 0 ? Math.min(1, filledPages.length / 3) : 0,
      detail:
        filledPages.length === 0
          ? 'No notes captured yet'
          : `${filledPages.length} note page${filledPages.length === 1 ? '' : 's'} with content`,
      count: filledPages.length,
      total: Math.max(pages.length, filledPages.length),
    },
    {
      key: 'data',
      label: 'Data',
      group: 'capture',
      weight: WEIGHTS.data,
      ratio: datasets.length > 0 ? 1 : 0,
      detail:
        datasets.length === 0
          ? 'No datasets imported'
          : `${datasets.length} dataset${datasets.length === 1 ? '' : 's'}`,
      count: datasets.length,
    },
    {
      key: 'figures',
      label: 'Figures',
      group: 'capture',
      weight: WEIGHTS.figures,
      ratio: assets.length > 0 ? Math.min(1, assets.length / 2) : 0,
      detail:
        assets.length === 0
          ? 'No figures uploaded'
          : `${assets.length} figure${assets.length === 1 ? '' : 's'}`,
      count: assets.length,
    },
    {
      key: 'labLog',
      label: 'Lab Log',
      group: 'capture',
      weight: WEIGHTS.labLog,
      ratio: labEntries.length > 0 ? Math.min(1, labEntries.length / 3) : 0,
      detail:
        labEntries.length === 0
          ? 'No lab entries yet'
          : `${labEntries.length} log entr${labEntries.length === 1 ? 'y' : 'ies'}`,
      count: labEntries.length,
    },
    {
      key: 'manuscript',
      label: 'Manuscript',
      group: 'write',
      weight: WEIGHTS.manuscript,
      ratio: filledSections.length / PUBLICATION_SECTIONS.length,
      detail: `${filledSections.length} of ${PUBLICATION_SECTIONS.length} sections filled`,
      count: filledSections.length,
      total: PUBLICATION_SECTIONS.length,
    },
    {
      key: 'milestones',
      label: 'Milestones',
      group: 'plan',
      weight: WEIGHTS.milestones,
      ratio: milestoneRatio,
      detail:
        milestones.length === 0
          ? 'No milestones set'
          : `${milestoneDone} of ${milestones.length} completed`,
      count: milestoneDone,
      total: milestones.length || undefined,
    },
  ]

  const weighted = buckets.reduce((sum, b) => sum + b.ratio * b.weight, 0)
  const percent = Math.round(Math.min(100, Math.max(0, weighted)))

  const workDone: string[] = []
  const remaining: string[] = []
  for (const b of buckets) {
    if (b.ratio >= 0.99) workDone.push(b.detail)
    else if (b.ratio > 0) workDone.push(b.detail)
    if (b.ratio < 1) remaining.push(`${b.label}: ${b.detail}`)
  }
  if (hasDraftText(progressNarrative?.content)) {
    workDone.push('Progress narrative drafted')
  }

  const activity = buildActivity({
    pages,
    datasets,
    assets,
    labEntries,
    drafts,
    milestones,
  })

  const stamps = [
    ...pages.map((p) => p.updatedAt),
    ...datasets.map((d) => d.updatedAt),
    ...assets.map((a) => a.createdAt),
    ...labEntries.map((e) => e.timestamp),
    ...drafts.map((d) => d.updatedAt),
    tracker?.updatedAt,
  ].filter(Boolean) as string[]
  stamps.sort()
  const lastUpdated = stamps.length ? stamps[stamps.length - 1]! : null

  return {
    percent,
    buckets,
    workDone,
    remaining,
    activity,
    labEntries,
    manuscriptFilled: filledSections.length,
    manuscriptTotal: PUBLICATION_SECTIONS.length,
    milestoneDone,
    milestoneTotal: milestones.length,
    lastUpdated,
  }
}

function buildActivity(input: {
  pages: { id: string; title: string; updatedAt: string; content: { content?: unknown[] } | null }[]
  datasets: { id: string; name: string; updatedAt: string }[]
  assets: { id: string; name: string; createdAt: string }[]
  labEntries: LabEntry[]
  drafts: Draft[]
  milestones: ProgressMilestone[]
}): ProgressActivityItem[] {
  const items: ProgressActivityItem[] = []

  for (const e of input.labEntries) {
    items.push({
      id: `lab-${e.id}`,
      kind: 'lab',
      title: 'Lab Log entry',
      detail: e.text.trim().slice(0, 140) || 'Empty entry',
      at: e.timestamp,
    })
  }
  for (const p of input.pages) {
    if (!pageHasContent(p)) continue
    items.push({
      id: `page-${p.id}`,
      kind: 'material',
      title: p.title || 'Untitled note',
      detail: 'Materials page updated',
      at: p.updatedAt,
    })
  }
  for (const d of input.datasets) {
    items.push({
      id: `data-${d.id}`,
      kind: 'data',
      title: d.name || 'Dataset',
      detail: 'Dataset updated',
      at: d.updatedAt,
    })
  }
  for (const a of input.assets) {
    items.push({
      id: `fig-${a.id}`,
      kind: 'figure',
      title: a.name || 'Figure',
      detail: 'Figure added',
      at: a.createdAt,
    })
  }
  for (const d of input.drafts) {
    if (d.section === PROGRESS_TRACKER_SECTION) continue
    if (!hasDraftText(d.content)) continue
    const label =
      d.outputType === 'publication' && d.section
        ? `Manuscript · ${d.section}`
        : d.outputType === 'progressReports'
          ? 'Progress narrative'
          : d.outputType
    items.push({
      id: `draft-${d.id}`,
      kind: 'draft',
      title: label,
      detail: 'Draft updated',
      at: d.updatedAt,
    })
  }
  for (const m of input.milestones) {
    items.push({
      id: `ms-${m.id}`,
      kind: 'milestone',
      title: m.title,
      detail: `Milestone · ${m.status}`,
      at: m.updatedAt,
    })
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40)
}

export function healthLabel(health: ProgressHealth): string {
  switch (health) {
    case 'on_track':
      return 'On track'
    case 'at_risk':
      return 'At risk'
    case 'delayed':
      return 'Delayed'
    case 'completed':
      return 'Completed'
  }
}

/** Compose a structured Markdown progress narrative from live metrics. */
export function composeProgressNarrative(
  snapshot: NotebookProgressSnapshot,
  tracker: ProgressTracker,
): string {
  const period =
    tracker.periodStart || tracker.periodEnd
      ? `**Reporting period:** ${tracker.periodStart || '—'} → ${tracker.periodEnd || '—'}`
      : ''

  const doneList =
    snapshot.workDone.length > 0
      ? snapshot.workDone.map((w) => `- ${w}`).join('\n')
      : '- No capture or write activity recorded yet.'

  const remainingList =
    snapshot.remaining.length > 0
      ? snapshot.remaining.map((w) => `- ${w}`).join('\n')
      : '- All tracked surfaces look complete.'

  const milestoneLines =
    tracker.milestones.length > 0
      ? tracker.milestones
          .map((m) => {
            const due = m.dueDate ? ` (due ${m.dueDate})` : ''
            return `- [${m.status === 'done' ? 'x' : ' '}] **${m.title}** — ${m.status}${due}${m.notes ? `: ${m.notes}` : ''}`
          })
          .join('\n')
      : '- No milestones defined yet.'

  const recentLogs = snapshot.activity
    .slice(0, 8)
    .map((a) => `- ${relativeTime(a.at)} — **${a.title}**: ${a.detail}`)
    .join('\n')

  const labDigest =
    snapshot.labEntries.length > 0
      ? snapshot.labEntries
          .slice(0, 5)
          .map((e) => {
            const when = e.timestamp.slice(0, 16).replace('T', ' ')
            return `- ${when} (${e.author}): ${e.text.trim().slice(0, 180)}`
          })
          .join('\n')
      : '- No Lab Log entries yet.'

  return [
    `# Progress Report`,
    '',
    period,
    `**Overall progress:** ${snapshot.percent}%`,
    `**Status:** ${healthLabel(tracker.health)}`,
    tracker.updatedAt ? `**Tracker updated:** ${relativeTime(tracker.updatedAt)}` : '',
    '',
    `## Work done so far`,
    '',
    tracker.summary.trim() || doneList,
    '',
    `## Capture & write coverage`,
    '',
    doneList,
    '',
    `## Still outstanding`,
    '',
    remainingList,
    '',
    `## Milestones`,
    '',
    milestoneLines,
    '',
    `## Blockers`,
    '',
    tracker.blockers.trim() || '- None recorded.',
    '',
    `## Next steps`,
    '',
    tracker.nextSteps.trim() || '- Add next steps for the coming period.',
    '',
    `## Recent activity`,
    '',
    recentLogs || '- No recent activity.',
    '',
    `## Recent Lab Log`,
    '',
    labDigest,
    '',
    `## Manuscript progress`,
    '',
    `${snapshot.manuscriptFilled} of ${snapshot.manuscriptTotal} sections have content.`,
  ]
    .filter((line) => line !== '')
    .join('\n')
}
