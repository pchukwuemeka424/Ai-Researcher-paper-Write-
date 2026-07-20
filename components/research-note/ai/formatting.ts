import { PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import { getDraftFor } from '@/components/research-note/storage/repositories'
import { getTemplateContext } from '@/components/research-note/context-providers'
import { draftContentToMarkdown } from '@/components/research-note/lib/markdown'
import { sanitizeDashes } from './drafting'
import { generate } from './client'

/**
 * Journal-submission formatter. Uses the project OpenRouter LLM to restructure
 * a manuscript into a target journal's sections and style.
 */
export async function reformatForJournal(
  projectId: string,
  manuscript: string,
  journal: string,
): Promise<{ text: string; provider: string; model: string }> {
  const template = await getTemplateContext(projectId)
  const system = [
    'You are an expert academic copy-editor preparing a manuscript for journal submission.',
    `Reformat the manuscript to match the standard structure and style of "${journal || 'a general academic journal'}".`,
    'Do not add a References or bibliography section. Preserve substantive content and results; adjust section ordering, headings, and formatting to fit the target. Output Markdown.',
    'Do not use em dashes (—) or en dashes (–). Use commas, colons, parentheses, or hyphens (-) instead.',
  ].join(' ')

  const user = [
    template
      ? `## Target style exemplar (imitate its structure only)\n${template}\n`
      : '',
    '## Manuscript to reformat\n',
    manuscript,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await generate({
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: 4096,
  })
  return { ...result, text: sanitizeDashes(result.text) }
}

/** Concatenate the drafted Publication sections into one manuscript (Markdown). */
export async function assemblePublicationManuscript(
  projectId: string,
): Promise<string> {
  const parts: string[] = []
  for (const section of PUBLICATION_SECTIONS) {
    const draft = await getDraftFor(projectId, 'publication', section)
    if (draft?.content.trim()) {
      parts.push(`# ${section}\n\n${draftContentToMarkdown(draft.content).trim()}`)
    }
  }
  return parts.join('\n\n')
}
