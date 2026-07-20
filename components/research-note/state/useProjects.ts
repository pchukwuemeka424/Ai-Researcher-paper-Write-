import { useCallback, useEffect, useState } from 'react'
import {
  createProject as createRemoteProject,
  deleteProject as deleteRemoteProject,
  fetchProjects,
  updateProject as updateRemoteProject,
  type ResearchProject,
} from '@/lib/research-assets-api'
import {
  deleteProject as deleteLocalProject,
  upsertProject,
} from '@/components/research-note/storage/repositories'
import type { Project } from '@/components/research-note/storage/types'

function toLocalProject(p: ResearchProject): Project {
  return {
    id: p.id,
    title: p.title,
    focus: p.description ?? '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

/** Dashboard projects — backed by Mongo via `/api/research/projects`. */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const remote = await fetchProjects()
    const mapped = remote.map(toLocalProject)
    await Promise.all(mapped.map((p) => upsertProject(p)))
    setProjects(mapped)
    setError(null)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await refresh()
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load notebooks.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [refresh])

  const create = useCallback(
    async (input: { title: string; focus?: string }) => {
      const remote = await createRemoteProject({
        title: input.title,
        description: input.focus,
        projectType: 'research',
      })
      const local = toLocalProject(remote)
      await upsertProject(local)
      await refresh()
      return local
    },
    [refresh],
  )

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Project, 'title' | 'focus'>>) => {
      await updateRemoteProject(id, {
        title: patch.title,
        description: patch.focus,
      })
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteRemoteProject(id)
      try {
        await deleteLocalProject(id)
      } catch {
        /* local cache may already be empty */
      }
      await refresh()
    },
    [refresh],
  )

  return { projects, loading, error, create, update, remove, refresh }
}
