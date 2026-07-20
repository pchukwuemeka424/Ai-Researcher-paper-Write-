import { getProject } from '@/components/research-note/storage/repositories'
import type { OutputType } from '@/components/research-note/storage/types'
import { getNotesContext } from './NotesContext'
import { getDataContext } from './DataContext'
import { getTemplateContext } from './TemplateContext'
import { getReferencesContext } from './ReferencesContext'
import { getLabLogContext } from './LabLogContext'
import { getFiguresContext } from './FiguresContext'
import { getDraftsContext } from './DraftsContext'

export { getNotesContext } from './NotesContext'
export { getDataContext } from './DataContext'
export { getTemplateContext } from './TemplateContext'
export { getReferencesContext } from './ReferencesContext'
export { getLabLogContext } from './LabLogContext'
export { getFiguresContext } from './FiguresContext'
export { getDraftsContext } from './DraftsContext'
export * from './extractors'

/** Rough character budget for assembled context (keeps prompts and cost sane). */
const CONTEXT_BUDGET = 32000

export interface ProjectContext {
  title: string
  focus: string
  /** Assembled Materials + Data + Figures + Lab Log + References + sibling drafts. */
  material: string
  /** Upload-to-learn template exemplars (structure/style to imitate), if any. */
  template: string
  /** Named material slices for multi-agent routing. */
  agents: AgentMaterialSlices
}

/** Per-source slices so section agents can weight relevant materials. */
export interface AgentMaterialSlices {
  notes: string
  data: string
  figures: string
  labLog: string
  references: string
  drafts: string
}

export interface AssembleOptions {
  /** Exclude the draft slot being generated so it is not fed back into itself. */
  excludeDraft?: { outputType: OutputType; section: string | null }
}

function trimBudget(parts: string[], budget: number): string {
  let material = parts.filter(Boolean).join('\n\n')
  if (material.length > budget) {
    material = material.slice(0, budget) + '\n\n…(context trimmed)'
  }
  return material
}

/**
 * Assemble a project's material for the AI drafting engine.
 * Connects Materials, Data, Figures, Lab Log, References, and existing drafts
 * so every section agent can read what the user has inserted elsewhere.
 */
export async function assembleProjectContext(
  projectId: string,
  options?: AssembleOptions,
): Promise<ProjectContext> {
  const [project, notes, data, figures, labLog, references, drafts, template] =
    await Promise.all([
      getProject(projectId),
      getNotesContext(projectId),
      getDataContext(projectId),
      getFiguresContext(projectId),
      getLabLogContext(projectId),
      getReferencesContext(projectId),
      getDraftsContext(projectId, options?.excludeDraft),
      getTemplateContext(projectId),
    ])

  const agents: AgentMaterialSlices = {
    notes,
    data,
    figures,
    labLog,
    references,
    drafts,
  }

  const material = trimBudget(
    [notes, data, figures, labLog, references, drafts],
    CONTEXT_BUDGET,
  )

  return {
    title: project?.title ?? 'Untitled project',
    focus: project?.focus ?? '',
    material,
    template,
    agents,
  }
}
