import { OUTPUT_TABS, PUBLICATION_SECTIONS } from '@/components/research-note/config/branding'
import { isProgressTrackerDraft } from '@/components/research-note/features/progress/progressTracker'
import { draftContentToMarkdown } from '@/components/research-note/lib/markdown'
import { listDrafts } from '@/components/research-note/storage/repositories'
import type { Draft, OutputType } from '@/components/research-note/storage/types'

/** Per-draft body cap so sibling sections stay in budget. */
const PER_DRAFT_CAP = 3500

function draftLabel(d: Draft): string {
  const typeLabel =
    d.outputType in OUTPUT_TABS
      ? OUTPUT_TABS[d.outputType as keyof typeof OUTPUT_TABS]
      : d.outputType
  return d.section ? `${typeLabel} — ${d.section}` : typeLabel
}

function draftBody(d: Draft): string {
  const md = draftContentToMarkdown(d.content).trim()
  if (!md) return ''
  return md.length > PER_DRAFT_CAP
    ? md.slice(0, PER_DRAFT_CAP) + '\n…(trimmed)'
    : md
}

/**
 * DraftsContext — other AI/human draft sections so agents can cross-read.
 * Excludes the slot currently being generated (when specified).
 */
export async function getDraftsContext(
  projectId: string,
  exclude?: { outputType: OutputType; section: string | null },
): Promise<string> {
  const drafts = await listDrafts(projectId)
  const filled = drafts
    .filter((d) => d.content.trim())
    .filter((d) => !isProgressTrackerDraft(d.section))
    .filter(
      (d) =>
        !(
          exclude &&
          d.outputType === exclude.outputType &&
          d.section === exclude.section
        ),
    )

  if (filled.length === 0) return ''

  // Prefer publication IMRaD order, then other output types.
  const order = new Map<string, number>()
  PUBLICATION_SECTIONS.forEach((sec, i) => order.set(`publication::${sec}`, i))
  const rank = (d: Draft) =>
    order.get(`${d.outputType}::${d.section ?? ''}`) ?? 100 + d.outputType.charCodeAt(0)

  filled.sort((a, b) => rank(a) - rank(b) || a.updatedAt.localeCompare(b.updatedAt))

  const blocks = filled
    .map((d) => {
      const body = draftBody(d)
      if (!body) return ''
      return `### ${draftLabel(d)}\n${body}`
    })
    .filter(Boolean)

  if (blocks.length === 0) return ''
  return `## Existing drafts (other sections)\n\n${blocks.join('\n\n')}`
}
