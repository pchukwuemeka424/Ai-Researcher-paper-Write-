import { useCallback, useEffect, useState } from 'react'
import type { SnapshotMeta } from '@/components/research-note/features/sync/backend'
import {
  listVersions,
  restoreVersion,
  synchronize,
} from '@/components/research-note/features/sync/engine'
import { getLastSynced, type SyncSettings } from '@/components/research-note/features/sync/syncSettings'

/** Per-project sync state + actions: synchronize, list versions, restore. */
export function useProjectSync(projectId: string, syncSettings: SyncSettings) {
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [versions, setVersions] = useState<SnapshotMeta[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setVersions(await listVersions(syncSettings, projectId))
  }, [syncSettings, projectId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const ts = await getLastSynced(projectId)
      const list = await listVersions(syncSettings, projectId)
      if (!alive) return
      setLastSynced(ts)
      setVersions(list)
    })()
    return () => {
      alive = false
    }
  }, [projectId, syncSettings])

  const synchronizeNow = useCallback(
    async (label?: string) => {
      setError(null)
      setBusy(true)
      try {
        const ts = await synchronize(syncSettings, projectId, label)
        setLastSynced(ts)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync failed.')
      } finally {
        setBusy(false)
      }
    },
    [syncSettings, projectId, refresh],
  )

  const restore = useCallback(
    async (id: string) => {
      setError(null)
      setBusy(true)
      try {
        await restoreVersion(syncSettings, projectId, id)
        // Reload so every open view reflects the restored state.
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Restore failed.')
        setBusy(false)
      }
    },
    [syncSettings, projectId],
  )

  return { lastSynced, versions, busy, error, synchronizeNow, restore, refresh }
}
