import { useCallback, useEffect, useState } from 'react'
import {
  defaultAISettings,
  loadAISettings,
  saveAISettings,
  type AISettings,
} from '@/components/research-note/ai/settings'

/** Local AI prefs (auto-draft only). LLM is the project OpenRouter stack. */
export function useSettings() {
  const [settings, setSettings] = useState<AISettings>(defaultAISettings)

  useEffect(() => {
    let alive = true
    loadAISettings().then((s) => {
      if (alive) setSettings(s)
    })
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (next: AISettings) => {
    setSettings(next)
    await saveAISettings(next)
  }, [])

  const setAutoDraft = useCallback(
    (autoDraft: boolean) => update({ ...settings, autoDraft }),
    [settings, update],
  )

  return { settings, setAutoDraft }
}
