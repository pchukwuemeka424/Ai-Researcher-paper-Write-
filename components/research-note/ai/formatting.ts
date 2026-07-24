import {
  AI_DRAFT_TABS,
  PUBLICATION_SECTIONS,
} from '@/components/research-note/config/branding'
import {
  getDraftFor,
  listAssets,
  listDatasets,
  listLabEntries,
  listPages,
} from '@/components/research-note/storage/repositories'
import { getTemplateContext } from '@/components/research-note/context-providers'
import {
  datasetSummary,
  datasetToTable,
  docToPlainText,
} from '@/components/research-note/context-providers/extractors'
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

function pushIfFilled(
  parts: string[],
  heading: string,
  body: string | null | undefined,
) {
  const trimmed = body?.trim()
  if (!trimmed) return
  parts.push(`# ${heading}\n\n${trimmed}`)
}

/**
 * Capture every filled notebook surface into one Markdown document:
 * Materials, Data, Figures, Lab Log, Progress Reports,
 * then all Manuscript sections (Title → Supplementary).
 */
export async function assembleAllCaptured(
  projectId: string,
): Promise<string> {
  const [pages, datasets, assets, labEntries, progressReport] =
    await Promise.all([
      listPages(projectId),
      listDatasets(projectId),
      listAssets(projectId),
      listLabEntries(projectId),
      getDraftFor(projectId, 'progressReports', null),
    ])

  const parts: string[] = []

  const materialBlocks = pages
    .map((p) => {
      const body = docToPlainText(p.content)
      if (!body) return ''
      return `## ${p.title}\n\n${body}`
    })
    .filter(Boolean)
  pushIfFilled(parts, AI_DRAFT_TABS.notes, materialBlocks.join('\n\n'))

  const DATA_PDF_ROW_LIMIT = 5
  const dataBlocks = datasets.map((d) => {
    const shown = Math.min(d.rows.length, DATA_PDF_ROW_LIMIT)
    const note =
      d.rows.length > DATA_PDF_ROW_LIMIT
        ? `\n\n_(showing first ${DATA_PDF_ROW_LIMIT} of ${d.rows.length} rows)_`
        : shown === 0
          ? '\n\n_(no data rows)_'
          : ''
    return `## ${datasetSummary(d)}\n\n${datasetToTable(d, DATA_PDF_ROW_LIMIT)}${note}`
  })
  pushIfFilled(parts, AI_DRAFT_TABS.data, dataBlocks.join('\n\n'))

  if (assets.length > 0) {
    const figureBlocks: string[] = []
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i]!
      const when = a.createdAt.slice(0, 10)
      const caption = `Figure ${i + 1}: ${a.name || 'Untitled'} (added ${when})`
      if (a.mime.startsWith('image/') && a.blob.size > 0 && a.blob.size <= 6_000_000) {
        try {
          const dataUrl = await blobToDataUrl(a.blob)
          figureBlocks.push(`### ${caption}\n\n![${caption}](${dataUrl})`)
          continue
        } catch {
          /* fall through to text-only */
        }
      }
      const kind = a.mime.startsWith('image/') ? 'image' : a.mime
      figureBlocks.push(`- ${caption} (${kind})`)
    }
    pushIfFilled(parts, AI_DRAFT_TABS.images, figureBlocks.join('\n\n'))
  }

  if (labEntries.length > 0) {
    const blocks = labEntries.map((e) => {
      const when = e.timestamp.slice(0, 19).replace('T', ' ')
      return `## ${when} — ${e.author}\n\n${e.text.trim()}`
    })
    pushIfFilled(parts, AI_DRAFT_TABS.eln, blocks.join('\n\n'))
  }

  pushIfFilled(
    parts,
    AI_DRAFT_TABS.progressReports,
    progressReport?.content
      ? draftContentToMarkdown(progressReport.content)
      : '',
  )

  for (const section of PUBLICATION_SECTIONS) {
    const draft = await getDraftFor(projectId, 'publication', section)
    if (draft?.content.trim()) {
      parts.push(
        `# ${section}\n\n${draftContentToMarkdown(draft.content).trim()}`,
      )
    }
  }

  return parts.join('\n\n')
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
    reader.readAsDataURL(blob)
  })
}
