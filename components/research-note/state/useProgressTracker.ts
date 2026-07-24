import { useCallback, useEffect, useRef, useState } from 'react'
import { debounce } from '@/components/research-note/lib/debounce'
import {
  createMilestone,
  emptyProgressTracker,
  loadProgressTracker,
  saveProgressTracker,
  type MilestoneStatus,
  type ProgressHealth,
  type ProgressMilestone,
  type ProgressTracker,
} from '@/components/research-note/features/progress/progressTracker'
import {
  computeNotebookProgress,
  type NotebookProgressSnapshot,
} from '@/components/research-note/features/progress/progressMetrics'

export function useProgressTracker(projectId: string) {
  const [tracker, setTracker] = useState<ProgressTracker>(emptyProgressTracker)
  const [snapshot, setSnapshot] = useState<NotebookProgressSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackerRef = useRef(tracker)
  trackerRef.current = tracker

  const refreshSnapshot = useCallback(async (next?: ProgressTracker) => {
    const snap = await computeNotebookProgress(projectId, next ?? trackerRef.current)
    setSnapshot(snap)
    return snap
  }, [projectId])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadProgressTracker(projectId)
      setTracker(loaded)
      trackerRef.current = loaded
      await refreshSnapshot(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load progress tracker.')
    } finally {
      setLoading(false)
    }
  }, [projectId, refreshSnapshot])

  useEffect(() => {
    void reload()
  }, [reload])

  const persist = useMemoDebouncedPersist(projectId, setSaving, setError, refreshSnapshot)

  const updateTracker = useCallback(
    (patch: Partial<ProgressTracker> | ((prev: ProgressTracker) => ProgressTracker)) => {
      setTracker((prev) => {
        const next =
          typeof patch === 'function' ? patch(prev) : { ...prev, ...patch, version: 1 as const }
        trackerRef.current = next
        persist(next)
        void refreshSnapshot(next)
        return next
      })
    },
    [persist, refreshSnapshot],
  )

  const setHealth = (health: ProgressHealth) => updateTracker({ health })
  const setPeriod = (periodStart: string, periodEnd: string) =>
    updateTracker({ periodStart, periodEnd })
  const setSummary = (summary: string) => updateTracker({ summary })
  const setBlockers = (blockers: string) => updateTracker({ blockers })
  const setNextSteps = (nextSteps: string) => updateTracker({ nextSteps })

  const addMilestone = (title?: string) => {
    updateTracker((prev) => ({
      ...prev,
      milestones: [...prev.milestones, createMilestone(title)],
    }))
  }

  const updateMilestone = (id: string, patch: Partial<ProgressMilestone>) => {
    updateTracker((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m,
      ),
    }))
  }

  const setMilestoneStatus = (id: string, status: MilestoneStatus) => {
    updateMilestone(id, { status })
  }

  const removeMilestone = (id: string) => {
    updateTracker((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }))
  }

  const saveNow = async () => {
    setSaving(true)
    setError(null)
    try {
      const saved = await saveProgressTracker(projectId, trackerRef.current)
      setTracker(saved)
      trackerRef.current = saved
      await refreshSnapshot(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save progress tracker.')
    } finally {
      setSaving(false)
    }
  }

  return {
    tracker,
    snapshot,
    loading,
    saving,
    error,
    reload,
    refreshSnapshot,
    updateTracker,
    setHealth,
    setPeriod,
    setSummary,
    setBlockers,
    setNextSteps,
    addMilestone,
    updateMilestone,
    setMilestoneStatus,
    removeMilestone,
    saveNow,
  }
}

function useMemoDebouncedPersist(
  projectId: string,
  setSaving: (v: boolean) => void,
  setError: (v: string | null) => void,
  refreshSnapshot: (next?: ProgressTracker) => Promise<NotebookProgressSnapshot>,
) {
  const saveRef = useRef(
    debounce(async (next: ProgressTracker) => {
      setSaving(true)
      setError(null)
      try {
        await saveProgressTracker(projectId, next)
        await refreshSnapshot(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save progress tracker.')
      } finally {
        setSaving(false)
      }
    }, 600),
  )

  useEffect(() => {
    const fn = saveRef.current
    return () => fn.flush()
  }, [projectId])

  useEffect(() => {
    saveRef.current = debounce(async (next: ProgressTracker) => {
      setSaving(true)
      setError(null)
      try {
        await saveProgressTracker(projectId, next)
        await refreshSnapshot(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save progress tracker.')
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [projectId, refreshSnapshot, setError, setSaving])

  return useCallback((next: ProgressTracker) => {
    saveRef.current(next)
  }, [])
}
