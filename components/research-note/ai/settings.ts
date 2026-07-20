import { getSetting, setSetting } from '@/components/research-note/storage/repositories'

/**
 * Local AI prefs for Research Note. Provider/model/keys come from the project
 * backend (`OPENROUTER_API_KEY` / `FEYNMAN_MODEL`) — not from the UI.
 */
export interface AISettings {
  /** Manual vs Automatic AI drafting (Manual is the default — cost control). */
  autoDraft: boolean
}

export const defaultAISettings: AISettings = {
  autoDraft: false,
}

const SETTINGS_KEY = 'ai'

export async function loadAISettings(): Promise<AISettings> {
  const saved = await getSetting<Partial<AISettings>>(SETTINGS_KEY)
  return { ...defaultAISettings, autoDraft: Boolean(saved?.autoDraft) }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await setSetting(SETTINGS_KEY, settings)
}
