import { useCallback, useEffect, useState } from 'react'
import {
  createReference,
  deleteReference,
  listReferences,
} from '@/components/research-note/storage/repositories'
import type { Reference } from '@/components/research-note/storage/types'
import type { ParsedReference } from '@/components/research-note/features/references/crossref'

/** A project's reference library. */
export function useReferences(projectId: string) {
  const [references, setReferences] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listReferences(projectId).then((list) => {
      if (!alive) return
      setReferences(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [projectId])

  const add = useCallback(
    async (parsed: ParsedReference) => {
      const ref = await createReference({ ...parsed, projectId })
      setReferences((prev) => [ref, ...prev])
      return ref
    },
    [projectId],
  )

  const remove = useCallback(async (id: string) => {
    await deleteReference(id)
    setReferences((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return { references, loading, add, remove }
}
