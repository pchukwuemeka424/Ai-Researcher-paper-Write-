import { newId } from '@/components/research-note/storage/ids'
import { getDraftFor, saveDraft } from '@/components/research-note/storage/repositories'

/** Draft section key used to persist structured progress tracker JSON. */
export const PROGRESS_TRACKER_SECTION = '__tracker__'

export type ProgressHealth = 'on_track' | 'at_risk' | 'delayed' | 'completed'

export type MilestoneStatus = 'todo' | 'doing' | 'done' | 'blocked'

export type ProgressMilestone = {
  id: string
  title: string
  status: MilestoneStatus
  dueDate: string
  notes: string
  updatedAt: string
}

export type ProgressTracker = {
  version: 1
  health: ProgressHealth
  periodStart: string
  periodEnd: string
  /** Short “work done so far” summary (editable). */
  summary: string
  blockers: string
  nextSteps: string
  milestones: ProgressMilestone[]
  updatedAt: string
}

export function emptyProgressTracker(): ProgressTracker {
  const now = new Date().toISOString()
  return {
    version: 1,
    health: 'on_track',
    periodStart: '',
    periodEnd: '',
    summary: '',
    blockers: '',
    nextSteps: '',
    milestones: [],
    updatedAt: now,
  }
}

export function createMilestone(title = 'New milestone'): ProgressMilestone {
  return {
    id: newId(),
    title,
    status: 'todo',
    dueDate: '',
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

export function parseProgressTracker(raw: string | null | undefined): ProgressTracker | null {
  if (!raw?.trim()) return null
  try {
    const data = JSON.parse(raw) as Partial<ProgressTracker>
    if (data.version !== 1 || !Array.isArray(data.milestones)) return null
    return {
      version: 1,
      health: (data.health as ProgressHealth) || 'on_track',
      periodStart: data.periodStart ?? '',
      periodEnd: data.periodEnd ?? '',
      summary: data.summary ?? '',
      blockers: data.blockers ?? '',
      nextSteps: data.nextSteps ?? '',
      milestones: data.milestones.map((m) => ({
        id: m.id || newId(),
        title: m.title || 'Milestone',
        status: (m.status as MilestoneStatus) || 'todo',
        dueDate: m.dueDate || '',
        notes: m.notes || '',
        updatedAt: m.updatedAt || new Date().toISOString(),
      })),
      updatedAt: data.updatedAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function loadProgressTracker(projectId: string): Promise<ProgressTracker> {
  const draft = await getDraftFor(projectId, 'progressReports', PROGRESS_TRACKER_SECTION)
  return parseProgressTracker(draft?.content) ?? emptyProgressTracker()
}

export async function saveProgressTracker(
  projectId: string,
  tracker: ProgressTracker,
): Promise<ProgressTracker> {
  const next: ProgressTracker = {
    ...tracker,
    version: 1,
    updatedAt: new Date().toISOString(),
  }
  await saveDraft(projectId, 'progressReports', PROGRESS_TRACKER_SECTION, {
    content: JSON.stringify(next),
    humanEdited: true,
    provider: null,
    model: null,
  })
  return next
}

export function isProgressTrackerDraft(section: string | null | undefined): boolean {
  return section === PROGRESS_TRACKER_SECTION
}
