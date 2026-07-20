import type { ChangeLogEntry } from '@/components/research-note/storage/types'
import type { Snapshot, SnapshotMeta, SyncBackend } from './backend'
import type { ProjectState } from '@/components/research-note/storage/repositories'
import { getSupabaseClient } from './supabaseClient'

/**
 * Supabase sync backend (Postgres + Row-Level Security). Maps the SyncBackend
 * contract onto two tables — `changes` and `snapshots` — defined in
 * supabase/schema.sql, where RLS scopes every row to the owner (and, in Phase 6,
 * to invited collaborators). Requires a signed-in user; the anon key + user JWT
 * are what RLS checks.
 */
export function createSupabaseBackend(url: string, anonKey: string): SyncBackend {
  const client = () => getSupabaseClient(url, anonKey)

  return {
    id: 'supabase',

    async pushChanges(projectId, changes) {
      if (changes.length === 0) return
      const sb = await client()
      const rows = changes.map((entry: ChangeLogEntry) => ({
        id: entry.id,
        project_id: projectId,
        timestamp: entry.timestamp,
        entry,
      }))
      const { error } = await sb.from('changes').upsert(rows)
      if (error) throw new Error(error.message)
    },

    async pullChanges(projectId, since) {
      const sb = await client()
      const { data, error } = await sb
        .from('changes')
        .select('entry')
        .eq('project_id', projectId)
        .gt('timestamp', since)
        .order('timestamp', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => r.entry as ChangeLogEntry)
    },

    async saveSnapshot(snapshot: Snapshot) {
      const sb = await client()
      const { error } = await sb.from('snapshots').insert({
        id: snapshot.id,
        project_id: snapshot.projectId,
        timestamp: snapshot.timestamp,
        label: snapshot.label,
        state: snapshot.state,
      })
      if (error) throw new Error(error.message)
    },

    async listSnapshots(projectId) {
      const sb = await client()
      const { data, error } = await sb
        .from('snapshots')
        .select('id, project_id, timestamp, label')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(
        (r): SnapshotMeta => ({
          id: r.id as string,
          projectId: r.project_id as string,
          timestamp: r.timestamp as string,
          label: r.label as string,
        }),
      )
    },

    async getSnapshot(id) {
      const sb = await client()
      const { data, error } = await sb.from('snapshots').select('*').eq('id', id).single()
      if (error) return undefined
      return {
        id: data.id as string,
        projectId: data.project_id as string,
        timestamp: data.timestamp as string,
        label: data.label as string,
        state: data.state as ProjectState,
      }
    },
  }
}
