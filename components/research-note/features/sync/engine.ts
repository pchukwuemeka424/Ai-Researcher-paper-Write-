import { applyProjectState, getProjectState } from '@/components/research-note/storage/repositories'
import { newId, nowISO } from '@/components/research-note/storage/ids'
import type { SyncBackend, Snapshot, SnapshotMeta } from './backend'
import { mockBackend } from './mockBackend'
import { createSupabaseBackend } from './supabaseBackend'
import { setLastSynced, type SyncSettings } from './syncSettings'

/**
 * Explicit-sync engine. Sync is snapshot-based: Synchronize captures the
 * project's current state as a timestamped version in the backend; History lists
 * every version (from any device via the shared backend) and can restore one
 * NON-DESTRUCTIVELY — the restore is itself logged, and the pre-restore state is
 * auto-saved first, so nothing is ever lost (non-negotiables #2 and #3).
 */
export function backendFor(settings: SyncSettings): SyncBackend {
  if (settings.backend === 'supabase' && settings.supabaseUrl && settings.supabaseAnonKey) {
    return createSupabaseBackend(settings.supabaseUrl, settings.supabaseAnonKey)
  }
  return mockBackend
}

/** Capture the current project state as a new version and update "last synced". */
export async function synchronize(
  settings: SyncSettings,
  projectId: string,
  label?: string,
): Promise<string> {
  const backend = backendFor(settings)
  const state = await getProjectState(projectId)
  const timestamp = nowISO()
  const snapshot: Snapshot = {
    id: newId(),
    projectId,
    timestamp,
    label: label ?? 'Synchronized',
    state,
  }
  await backend.saveSnapshot(snapshot)
  await setLastSynced(projectId, timestamp)
  return timestamp
}

export async function listVersions(
  settings: SyncSettings,
  projectId: string,
): Promise<SnapshotMeta[]> {
  return backendFor(settings).listSnapshots(projectId)
}

export async function getVersion(
  settings: SyncSettings,
  id: string,
): Promise<Snapshot | undefined> {
  return backendFor(settings).getSnapshot(id)
}

/**
 * Restore a past version. Auto-saves the current state first (so it stays in
 * history), then applies the snapshot as a fresh, logged change.
 */
export async function restoreVersion(
  settings: SyncSettings,
  projectId: string,
  id: string,
): Promise<void> {
  const backend = backendFor(settings)
  const snapshot = await backend.getSnapshot(id)
  if (!snapshot) throw new Error('Version not found.')

  // Preserve the current state before overwriting.
  await backend.saveSnapshot({
    id: newId(),
    projectId,
    timestamp: nowISO(),
    label: 'Auto-saved before restore',
    state: await getProjectState(projectId),
  })

  await applyProjectState(projectId, snapshot.state)
  await setLastSynced(projectId, nowISO())
}
