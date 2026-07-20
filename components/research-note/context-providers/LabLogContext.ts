import { listLabEntries } from '@/components/research-note/storage/repositories'

/** Cap entries so a long lab log does not dominate the prompt. */
const MAX_ENTRIES = 40

/**
 * LabLogContext — timestamped experiment log entries for Methods/Results drafting.
 */
export async function getLabLogContext(projectId: string): Promise<string> {
  const entries = await listLabEntries(projectId)
  if (entries.length === 0) return ''
  const slice = entries.slice(0, MAX_ENTRIES)
  const blocks = slice.map((e) => {
    const when = e.timestamp.slice(0, 19).replace('T', ' ')
    return `### ${when} — ${e.author}\n${e.text.trim()}`
  })
  const note =
    entries.length > MAX_ENTRIES
      ? `\n_(showing ${MAX_ENTRIES} of ${entries.length} lab log entries)_`
      : ''
  return `## Lab Log\n\n${blocks.join('\n\n')}${note}`
}
