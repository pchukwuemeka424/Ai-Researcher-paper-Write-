import { useCallback, useEffect, useState } from 'react'
import {
  inviteMember,
  listMembers,
  removeMember,
  updateMemberRole,
} from '@/components/research-note/storage/repositories'
import type { Member, MemberRole } from '@/components/research-note/storage/types'

/** A project's collaborators (invite, change role, remove). */
export function useMembers(projectId: string) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listMembers(projectId).then((list) => {
      if (!alive) return
      setMembers(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [projectId])

  const invite = useCallback(
    async (email: string, role: MemberRole) => {
      const member = await inviteMember({ projectId, email, role })
      setMembers((prev) => [...prev, member])
      return member
    },
    [projectId],
  )

  const setRole = useCallback(async (id: string, role: MemberRole) => {
    const updated = await updateMemberRole(id, role)
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await removeMember(id)
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }, [])

  return { members, loading, invite, setRole, remove }
}
