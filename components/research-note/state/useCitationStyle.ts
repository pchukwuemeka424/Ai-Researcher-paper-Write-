import { useCallback, useEffect, useState } from 'react'
import {
  CITATION_STYLE_GROUPS,
  CITATION_STYLES,
  DEFAULT_CITATION_STYLE,
  getStyleLabel,
  type CitationStyle,
} from '@/components/research-note/features/references/citation'
import {
  getProjectCitationStyle,
  setProjectCitationStyle,
} from '@/components/research-note/features/references/citationStyleSettings'
import { applyCitationStyleToPublication } from '@/components/research-note/ai/agents/applyCitationStyle'
import { listDrafts } from '@/components/research-note/storage/repositories'
import type { Draft } from '@/components/research-note/storage/types'

/**
 * Project-level citation style (same catalog as Reference Formatter).
 * Changing style rewrites Publication drafts (in-text cites + References).
 */
export function useCitationStyle(projectId: string) {
  const [style, setStyleState] = useState<CitationStyle>(DEFAULT_CITATION_STYLE)
  const [loaded, setLoaded] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastApply, setLastApply] = useState<{
    draftsUpdated: number
    references: number
  } | null>(null)

  useEffect(() => {
    let alive = true
    setLoaded(false)
    getProjectCitationStyle(projectId).then((s) => {
      if (!alive) return
      setStyleState(s)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [projectId])

  const setStyle = useCallback(
    async (next: CitationStyle, options?: { force?: boolean }) => {
      if (next === style && !options?.force) return true
      setError(null)
      setApplying(true)
      setLastApply(null)
      try {
        const result = await applyCitationStyleToPublication(projectId, next)
        setStyleState(next)
        setLastApply({
          draftsUpdated: result.draftsUpdated,
          references: result.references,
        })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not apply citation style.')
        return false
      } finally {
        setApplying(false)
      }
    },
    [projectId, style],
  )

  /** Re-apply the current reference style to all publication sections (cites only). */
  const reapplyStyle = useCallback(
    () => setStyle(style, { force: true }),
    [setStyle, style],
  )

  /** Persist style only (no rewrite) — used when no drafts exist yet. */
  const setStyleQuiet = useCallback(
    async (next: CitationStyle) => {
      await setProjectCitationStyle(projectId, next)
      setStyleState(next)
    },
    [projectId],
  )

  const reloadDrafts = useCallback(async (): Promise<Draft[]> => {
    return listDrafts(projectId)
  }, [projectId])

  return {
    style,
    styleLabel: getStyleLabel(style),
    styles: CITATION_STYLES,
    styleGroups: CITATION_STYLE_GROUPS,
    loaded,
    applying,
    error,
    lastApply,
    setStyle,
    reapplyStyle,
    setStyleQuiet,
    reloadDrafts,
  }
}
