import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ChangeLogEntry } from '@/components/research-note/storage/types'
import type { Snapshot, SnapshotMeta, SyncBackend } from './backend'

/**
 * Local "mock cloud" — a SECOND IndexedDB database standing in for the remote,
 * so the entire sync + snapshot + time-travel flow is testable offline with zero
 * credentials (the counterpart to the Mock AI provider). Real cross-device sync
 * is the Supabase backend's job; this proves the engine.
 */

interface CloudChange {
  id: string
  projectId: string
  timestamp: string
  entry: ChangeLogEntry
}

interface CloudDB extends DBSchema {
  changes: { key: string; value: CloudChange; indexes: { byProject: string } }
  snapshots: { key: string; value: Snapshot; indexes: { byProject: string } }
}

let dbPromise: Promise<IDBPDatabase<CloudDB>> | null = null
function cloud(): Promise<IDBPDatabase<CloudDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CloudDB>('researchpilot-cloud', 1, {
      upgrade(db) {
        db.createObjectStore('changes', { keyPath: 'id' }).createIndex('byProject', 'projectId')
        db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('byProject', 'projectId')
      },
    })
  }
  return dbPromise
}

export const mockBackend: SyncBackend = {
  id: 'local',

  async pushChanges(projectId, changes) {
    const db = await cloud()
    const tx = db.transaction('changes', 'readwrite')
    for (const entry of changes) {
      await tx.store.put({ id: entry.id, projectId, timestamp: entry.timestamp, entry })
    }
    await tx.done
  },

  async pullChanges(projectId, since) {
    const db = await cloud()
    const rows = await db.getAllFromIndex('changes', 'byProject', projectId)
    return rows
      .filter((r) => r.timestamp > since)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((r) => r.entry)
  },

  async saveSnapshot(snapshot) {
    await (await cloud()).put('snapshots', snapshot)
  },

  async listSnapshots(projectId) {
    const db = await cloud()
    const rows = await db.getAllFromIndex('snapshots', 'byProject', projectId)
    return rows
      .map(({ state: _state, ...meta }): SnapshotMeta => meta)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  },

  async getSnapshot(id) {
    return (await cloud()).get('snapshots', id)
  },
}
