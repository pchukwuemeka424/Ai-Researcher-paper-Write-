import { listAssets } from '@/components/research-note/storage/repositories'

/**
 * FiguresContext — figure/asset metadata for Title/Abstract/Results agents.
 * Blobs are omitted from text prompts; agents cite figures by name and describe
 * findings using Data tables that those figures visualise.
 */
export async function getFiguresContext(projectId: string): Promise<string> {
  const assets = await listAssets(projectId)
  if (assets.length === 0) return ''
  const list = assets
    .map((a, i) => {
      const when = a.createdAt.slice(0, 10)
      const kind = a.mime.startsWith('image/') ? 'image' : a.mime
      return `- Figure ${i + 1}: “${a.name}” (${kind}, added ${when}) — cite as Figure ${i + 1} in Results; summarise its finding in Abstract when relevant.`
    })
    .join('\n')
  return [
    '## Figures',
    '',
    'Saved research-note figures (empirical). Use these when drafting Title, Abstract, Results, Discussion, and Supplementary.',
    'Do not invent figures that are not listed. Reference them by the Figure N / file name below.',
    '',
    list,
  ].join('\n')
}
