import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNotebook,
  saveNotebook,
  type ResearchProject,
} from '@/lib/research-assets-api'
import { apiUrl } from '@/lib/api'
import { authHeaders } from '@/lib/auth'
import {
  applyProjectState,
  getProject,
  getProjectState,
  upsertProject,
  type ProjectState,
} from '@/components/research-note/storage/repositories'
import type { Project } from '@/components/research-note/storage/types'
import { debounce } from '@/components/research-note/lib/debounce'

async function fetchProjectMeta(projectId: string): Promise<ResearchProject> {
  const res = await fetch(apiUrl(`/api/research/projects/${encodeURIComponent(projectId)}`), {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Could not load project.')
  }
  const data = (await res.json()) as { project?: ResearchProject }
  if (!data.project) throw new Error('Project not found.')
  return data.project
}

function isProjectState(value: unknown): value is ProjectState {
  if (!value || typeof value !== 'object') return false
  const v = value as ProjectState
  return v.version === 1 && Array.isArray(v.sections) && Array.isArray(v.pages)
}

/**
 * Hydrate IndexedDB from Mongo notebook snapshot, then periodically autosave
 * back to `/api/research/projects/:id/notebook`.
 */
export function useCloudNotebook(projectId: string) {
  const [ready, setReady] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hydrated = useRef(false)

  const push = useCallback(async () => {
    if (!hydrated.current) return
    setSaving(true)
    setError(null)
    try {
      const state = await getProjectState(projectId)
      const { updatedAt } = await saveNotebook(projectId, state)
      setLastSaved(updatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save notebook.')
    } finally {
      setSaving(false)
    }
  }, [projectId])

  useEffect(() => {
    let alive = true
    hydrated.current = false
    setReady(false)
    setError(null)
    ;(async () => {
      try {
        const [meta, remote] = await Promise.all([
          fetchProjectMeta(projectId),
          fetchNotebook(projectId),
        ])
        const shell: Project = {
          id: meta.id,
          title: meta.title,
          focus: meta.description ?? '',
          createdAt: meta.createdAt,
          updatedAt: meta.updatedAt,
        }
        await upsertProject(shell)

        if (isProjectState(remote.notebookData)) {
          const state: ProjectState = {
            ...remote.notebookData,
            project: { ...(remote.notebookData.project ?? shell), ...shell, id: projectId },
          }
          await applyProjectState(projectId, state)
          if (alive) setLastSaved(remote.updatedAt)
        } else {
          const local = await getProject(projectId)
          if (!local) await upsertProject(shell)
        }
        hydrated.current = true
        if (alive) setReady(true)
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Could not load notebook.')
          setReady(true)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [projectId])

  useEffect(() => {
    if (!ready || !hydrated.current) return

    const debounced = debounce(() => {
      void push()
    }, 2500)

    const interval = window.setInterval(() => {
      void push()
    }, 30_000)

    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        debounced.flush()
        void push()
      }
    }
    document.addEventListener('visibilitychange', onHide)

    // Kick an early save after hydrate so empty shells land in Mongo.
    const kick = window.setTimeout(() => void push(), 1500)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(kick)
      document.removeEventListener('visibilitychange', onHide)
      debounced.flush()
    }
  }, [ready, push])

  const saveNow = useCallback(async () => {
    await push()
  }, [push])

  return {
    ready,
    saving,
    lastSaved,
    error,
    saveNow,
    statusLabel: saving
      ? 'Saving…'
      : lastSaved
        ? `Saved ${new Date(lastSaved).toLocaleTimeString()}`
        : ready
          ? 'Cloud ready'
          : 'Loading…',
  }
}
