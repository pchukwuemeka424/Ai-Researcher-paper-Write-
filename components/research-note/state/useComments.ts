import { useCallback, useEffect, useState } from 'react'
import {
  addComment,
  deleteComment,
  listComments,
  setCommentResolved,
} from '@/components/research-note/storage/repositories'
import type { Comment, CommentTargetKind } from '@/components/research-note/storage/types'

/** Comments on a single target (a note page or an AI draft). */
export function useComments(
  projectId: string,
  targetKind: CommentTargetKind,
  targetId: string,
) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listComments(projectId, targetKind, targetId).then((list) => {
      if (!alive) return
      setComments(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [projectId, targetKind, targetId])

  const add = useCallback(
    async (author: string, body: string) => {
      if (!body.trim()) return
      const comment = await addComment({ projectId, targetKind, targetId, author, body })
      setComments((prev) => [...prev, comment])
    },
    [projectId, targetKind, targetId],
  )

  const toggleResolved = useCallback(async (id: string, resolved: boolean) => {
    const updated = await setCommentResolved(id, resolved)
    setComments((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return { comments, loading, add, toggleResolved, remove }
}
