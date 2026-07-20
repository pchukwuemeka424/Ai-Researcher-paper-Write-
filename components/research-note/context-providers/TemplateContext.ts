import { listTemplates } from '@/components/research-note/storage/repositories'

/** Cap template text injected into prompts (structure matters more than length). */
const PER_TEMPLATE_CAP = 6000

/**
 * TemplateContext — the "upload-to-learn" templates (thesis templates / target
 * journal papers). Their extracted text is offered to the AI as a *style and
 * structure* exemplar to imitate, kept separate from the researcher's own
 * material (spec §7A).
 */
export async function getTemplateContext(projectId: string): Promise<string> {
  const templates = await listTemplates(projectId)
  if (templates.length === 0) return ''
  const blocks = templates.map((t) => {
    const body = t.content.slice(0, PER_TEMPLATE_CAP)
    return `### Template: ${t.name} (${t.kind})\n${body}`
  })
  return blocks.join('\n\n')
}
