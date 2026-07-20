import type { OutputType } from '@/components/research-note/storage/types'
import type { AgentMaterialSlices } from '@/components/research-note/context-providers'

/** Material sources that section agents can subscribe to. */
export type MaterialSource =
  | 'notes'
  | 'data'
  | 'figures'
  | 'labLog'
  | 'references'
  | 'drafts'

export interface SectionAgent {
  /** Stable id, e.g. `publication:Introduction` or `labReports`. */
  id: string
  outputType: OutputType
  section: string | null
  /** Human label for prompts. */
  label: string
  /** Role description injected into the system prompt. */
  role: string
  /** Which project materials this agent prioritizes. */
  reads: MaterialSource[]
  /** Whether to enrich with literature from the research/papers API. */
  useResearchApi: boolean
  /**
   * Whether to weave APA in-text citations (Author, Year) into the section.
   * False for Title, Abstract, Keywords.
   */
  useInTextCitations: boolean
  /** Extra drafting instructions for this slot. */
  guidance: string
}

export interface PriorSectionSnapshot {
  section: string
  content: string
}

export interface AgentBundle {
  target: SectionAgent
  /** Material text prioritized for this agent (still includes full context fallback). */
  prioritizedMaterial: string
  /**
   * Publication sections already filled before the target, in order
   * (Title first, then Abstract if present, then the rest).
   */
  priorSections: PriorSectionSnapshot[]
  /** Publication sections after the target that already have content. */
  laterSections: PriorSectionSnapshot[]
  /** Existing content in the target section — refine when present, else create. */
  existingContent: string | null
  mode: 'create' | 'refine'
  /** Optional literature snippets from research API. */
  literature: string
  /** How many papers the research API returned (0 if skipped/failed). */
  literatureCount: number
  /** Structured cite sources for verification / citation fix-up. */
  citeSources: import('./citationBank').CiteSource[]
}

export function pickMaterial(
  agents: AgentMaterialSlices,
  reads: MaterialSource[],
): string {
  const map: Record<MaterialSource, string> = {
    notes: agents.notes,
    data: agents.data,
    figures: agents.figures,
    labLog: agents.labLog,
    references: agents.references,
    drafts: agents.drafts,
  }
  return reads
    .map((key) => map[key])
    .filter(Boolean)
    .join('\n\n')
}
