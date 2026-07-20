import { useCallback, useEffect, useState } from 'react'
import {
  defaultSyncSettings,
  loadSyncSettings,
  saveSyncSettings,
  type SyncSettings,
} from '@/components/research-note/features/sync/syncSettings'

/** Cloud & sync configuration (backend, Supabase creds, Manual/Auto mode). */
export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(defaultSyncSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    loadSyncSettings().then((s) => {
      if (!alive) return
      setSettings(s)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch: Partial<SyncSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void saveSyncSettings(next)
      return next
    })
  }, [])

  return { settings, loaded, update }
}
