import { listReferences } from '@/components/research-note/storage/repositories'
import {
  DEFAULT_CITATION_STYLE,
  formatCitation,
} from '@/components/research-note/features/references/citation'
import { getProjectCitationStyle } from '@/components/research-note/features/references/citationStyleSettings'

/** ReferencesContext — the project's reference library for the AI (active style). */
export async function getReferencesContext(projectId: string): Promise<string> {
  const refs = await listReferences(projectId)
  if (refs.length === 0) return ''
  const style = (await getProjectCitationStyle(projectId)) || DEFAULT_CITATION_STYLE
  const list = refs
    .map((r) => `- ${formatCitation(r, style).replace(/\*/g, '')}`)
    .join('\n')
  return `## References (${style})\n\n${list}`
}
