import type { Dataset, RichTextDoc } from '@/components/research-note/storage/types'

/**
 * Pure structured-content → text extractors. These make imported spreadsheets
 * and documents *comprehensible to the AI layer*: the Phase 3 context providers
 * (DataContext / NotesContext) call these so the model can read tables and note
 * text — e.g. "summarize this dataset" or "pull these results into the draft".
 *
 * Kept dependency-free and framework-free so they can later be re-exposed as
 * MCP resources with no refactor (spec §5a).
 */

/** Render a dataset as a Markdown-ish table the model can read. */
export function datasetToTable(dataset: Dataset): string {
  const header = dataset.columns.map((c) => c.name).join(' | ')
  const divider = dataset.columns.map(() => '---').join(' | ')
  const body = dataset.rows
    .map((row) =>
      dataset.columns
        .map((c) => {
          const v = row.cells[c.id]
          return v === null || v === undefined ? '' : String(v)
        })
        .join(' | '),
    )
    .join('\n')
  return `Dataset: ${dataset.name}\n${header}\n${divider}\n${body}`
}

/** Compact per-column summary line (types + row count) for quick AI context. */
export function datasetSummary(dataset: Dataset): string {
  const cols = dataset.columns.map((c) => `${c.name} (${c.type})`).join(', ')
  return `${dataset.name}: ${dataset.rows.length} rows × ${dataset.columns.length} cols — ${cols}`
}

type DocNode = { type?: string; text?: string; content?: DocNode[] }

/** Flatten a TipTap/ProseMirror doc to plain text (paragraph breaks preserved). */
export function docToPlainText(doc: RichTextDoc | null): string {
  if (!doc) return ''
  const lines: string[] = []
  const walk = (node: DocNode, parentBlock: boolean) => {
    if (node.text) {
      lines[lines.length - 1] = (lines[lines.length - 1] ?? '') + node.text
    }
    const isBlock =
      node.type === 'paragraph' ||
      node.type === 'heading' ||
      node.type === 'listItem' ||
      node.type === 'blockquote' ||
      node.type === 'codeBlock'
    if (isBlock) lines.push('')
    node.content?.forEach((c) => walk(c, isBlock || parentBlock))
  }
  walk(doc as DocNode, true)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
