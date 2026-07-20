import type { ChangeLogEntry } from '@/components/research-note/storage/types'
import type { ProjectState } from '@/components/research-note/storage/repositories'

/**
 * The explicit-sync backend contract. Two implementations sit behind it: a local
 * "mock cloud" (a second IndexedDB database) for offline testing, and Supabase
 * (Postgres + RLS) for real multi-device sync. The engine and UI only ever talk
 * to this interface — swapping backends changes nothing else.
 */

export interface Snapshot {
  id: string
  projectId: string
  /** ISO timestamp this version was captured. */
  timestamp: string
  label: string
  state: ProjectState
}

export type SnapshotMeta = Omit<Snapshot, 'state'>

export interface SyncBackend {
  id: 'local' | 'supabase'
  /** Push local change-log entries to the remote. */
  pushChanges(projectId: string, changes: ChangeLogEntry[]): Promise<void>
  /** Pull remote change-log entries recorded after `since` (ISO). */
  pullChanges(projectId: string, since: string): Promise<ChangeLogEntry[]>
  /** Store a timestamped version snapshot. */
  saveSnapshot(snapshot: Snapshot): Promise<void>
  /** List snapshot metadata (newest first). */
  listSnapshots(projectId: string): Promise<SnapshotMeta[]>
  /** Fetch a full snapshot (for preview / restore). */
  getSnapshot(id: string): Promise<Snapshot | undefined>
}
