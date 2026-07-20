import { listPages } from '@/components/research-note/storage/repositories'
import { docToPlainText } from './extractors'

/**
 * NotesContext — the researcher's notes/pages as plain text for the AI.
 *
 * Shaped as a standalone async fetcher so it can be re-exposed as an MCP
 * resource later with no refactor (spec §5a).
 */
export async function getNotesContext(projectId: string): Promise<string> {
  const pages = await listPages(projectId)
  const blocks = pages
    .map((p) => {
      const body = docToPlainText(p.content)
      if (!body) return ''
      return `### ${p.title}\n${body}`
    })
    .filter(Boolean)
  if (blocks.length === 0) return ''
  return `## Materials\n\n${blocks.join('\n\n')}`
}
