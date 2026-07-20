import { getSetting, setSetting } from '@/components/research-note/storage/repositories'
import { cleanHeaderToken, cleanUrl } from '@/components/research-note/shared/sanitize'

/** Cloud + sync configuration (device-local; the Supabase keys live only here). */
export interface SyncSettings {
  backend: 'local' | 'supabase'
  supabaseUrl?: string
  supabaseAnonKey?: string
  /** Manual vs Automatic sync. Manual is the default (non-negotiable #2). */
  syncMode: 'manual' | 'automatic'
  /** Cached signed-in email (Supabase), for UI display. */
  userEmail?: string | null
}

// A deployment can bake in a shared Supabase project via Next public env vars
// (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). When present, every
// visitor gets cloud auth + sync automatically — no per-device configuration.
// Sanitize at the source: a key pasted with stray non-ASCII (e.g. a masked key
// copied as bullets, or a trailing newline) would otherwise crash header
// construction on the first authenticated request.
const ENV_SUPABASE_URL =
	cleanUrl(
		(typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) as string | undefined,
	) || undefined
const ENV_SUPABASE_ANON_KEY =
	cleanHeaderToken(
		(typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) as
			| string
			| undefined,
	) || undefined
const HAS_ENV_SUPABASE = Boolean(ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY)

export const defaultSyncSettings: SyncSettings = {
  backend: HAS_ENV_SUPABASE ? 'supabase' : 'local',
  supabaseUrl: ENV_SUPABASE_URL,
  supabaseAnonKey: ENV_SUPABASE_ANON_KEY,
  syncMode: 'manual',
  userEmail: null,
}

const KEY = 'sync'

export async function loadSyncSettings(): Promise<SyncSettings> {
  const saved = await getSetting<SyncSettings>(KEY)
  const merged = { ...defaultSyncSettings, ...saved }
  // A deployment's baked-in Supabase (env) fills in anything the user hasn't set
  // themselves, so peers get cloud auth without touching Settings.
  if (HAS_ENV_SUPABASE) {
    if (!merged.supabaseUrl) merged.supabaseUrl = ENV_SUPABASE_URL
    if (!merged.supabaseAnonKey) merged.supabaseAnonKey = ENV_SUPABASE_ANON_KEY
    if (!saved?.backend) merged.backend = 'supabase'
  }
  return merged
}

export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  await setSetting(KEY, settings)
}

// Per-project "last synced" watermark.
export async function getLastSynced(projectId: string): Promise<string | null> {
  return (await getSetting<string>(`syncstate:${projectId}`)) ?? null
}

export async function setLastSynced(projectId: string, iso: string): Promise<void> {
  await setSetting(`syncstate:${projectId}`, iso)
}
