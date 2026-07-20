import type { OutputType } from '@/components/research-note/storage/types'
import {
  getSectionChecklist,
  SECTION_CHECKLISTS,
} from './sectionChecklists'
import type { MaterialSource, SectionAgent } from './types'

const ALL_MATERIALS: MaterialSource[] = [
  'notes',
  'data',
  'figures',
  'labLog',
  'references',
  'drafts',
]

const PUBLICATION_READS: Record<string, MaterialSource[]> = {
  // Notebook Materials (notes) are excluded from all publication sections.
  // Title / Abstract / Keywords must still see Data + Figures so they reflect the study.
  Title: ['data', 'figures', 'labLog', 'drafts'],
  Abstract: ['data', 'figures', 'labLog', 'references', 'drafts'],
  Keywords: ['data', 'figures', 'references', 'drafts'],
  Introduction: ['data', 'figures', 'references', 'labLog', 'drafts'],
  'Literature Review': ['references', 'drafts'],
  'Materials & Methods': ['labLog', 'data', 'figures', 'references', 'drafts'],
  Results: ['data', 'figures', 'labLog', 'references', 'drafts'],
  Discussion: ['data', 'figures', 'references', 'labLog', 'drafts'],
  Conclusion: ['data', 'figures', 'references', 'drafts'],
  References: ['drafts', 'references'],
  Acknowledgements: ['drafts'],
  Supplementary: ['data', 'figures', 'labLog', 'drafts'],
}

/** Fallback reads for unknown publication sections — never includes notes/Materials. */
const PUBLICATION_FALLBACK_READS: MaterialSource[] = [
  'data',
  'figures',
  'labLog',
  'references',
  'drafts',
]

const PUBLICATION_ROLES: Record<string, string> = {
  Title:
    'Title Agent — craft a concise, informative manuscript title grounded in the project Data, Figures, and study focus.',
  Abstract:
    'Abstract Agent — summarise the whole study in ~150–250 words using aims plus findings from Data, Figures, and Lab Log.',
  Keywords: 'Keywords Agent — select searchable topic terms from Title, Abstract, Data, and Figures.',
  Introduction:
    'Introduction Agent — frame problem, gap, aims, and contribution with research-API citations (chat-paper style).',
  'Literature Review':
    'Literature Review Agent — synthesise themes, debates, methods, and gap with cited research-API sources.',
  'Materials & Methods':
    'Methods Agent — document sample, collection, analysis, and ethics; cite methods literature when relevant.',
  Results:
    'Results Agent — report findings from Data tables and Figures by name; light citations when comparing to prior work.',
  Discussion:
    'Discussion Agent — interpret results vs prior work with citations; cover limitations and implications.',
  Conclusion:
    'Conclusion Agent — wrap contribution and take-home message; optional light citations.',
  References:
    'References Agent — store and update bibliography entries for every source cited in publication sections.',
  Acknowledgements:
    'Acknowledgements Agent — credit funders and helpers only; no science claims.',
  Supplementary:
    'Supplementary Agent — list extra tables, figures, protocols, and appendices.',
}

function buildGuidance(section: string): string {
  const c = getSectionChecklist(section)
  if (!c) {
    return `Write the ${section} section in formal academic English as Markdown.`
  }
  const points = c.mustCover.map((p) => `• ${p}`).join(' ')
  const cite = c.useInTextCitations
    ? ' Fetch papers from the research API and weave APA (Author, Year) in-text citations for every substantive literature claim (same logic as /research).'
    : ' No in-text citations.'
  return [
    `If this section already has content, REFINE it until every checklist item is covered; if empty, GENERATE it.`,
    `Target length: ${c.wordTarget}.`,
    `Must capture: ${points}`,
    `Avoid: ${c.avoid.join('; ')}.`,
    cite,
    'Stay aligned with Title → Abstract and other filled sections; do not invent data or sources.',
  ].join(' ')
}

const PUBLICATION_AGENTS: Omit<SectionAgent, 'id' | 'outputType'>[] =
  Object.keys(SECTION_CHECKLISTS).map((section) => {
    const c = SECTION_CHECKLISTS[section]!
    return {
      section,
      label: section,
      role: PUBLICATION_ROLES[section] ?? `${section} Agent`,
      reads: PUBLICATION_READS[section] ?? PUBLICATION_FALLBACK_READS,
      useResearchApi: c.useResearchApi,
      useInTextCitations: c.useInTextCitations,
      guidance: buildGuidance(section),
    }
  })

function wholeDocAgent(
  outputType: OutputType,
  label: string,
  role: string,
  guidance: string,
  reads: MaterialSource[] = ALL_MATERIALS,
): SectionAgent {
  return {
    id: outputType,
    outputType,
    section: null,
    label,
    role,
    reads,
    useResearchApi: false,
    useInTextCitations: false,
    guidance,
  }
}

const WHOLE_DOC_AGENTS: SectionAgent[] = [
  wholeDocAgent(
    'labReports',
    'Lab Reports',
    'Lab Report Agent — produce a complete lab report from experimental materials.',
    'Structure as Aim, Materials & Methods, Results, and Discussion. Ground strictly in Lab Log, Data, Figures, and notes.',
    ['labLog', 'data', 'figures', 'notes', 'drafts', 'references'],
  ),
  wholeDocAgent(
    'progressReports',
    'Progress Reports',
    'Progress Report Agent — summarise progress, blockers, and next steps.',
    'Cover what was done, key findings so far, obstacles, and planned next steps. Use Lab Log chronology and recent notes/drafts.',
    ['labLog', 'notes', 'drafts', 'data', 'figures'],
  ),
  wholeDocAgent(
    'thesis',
    'Thesis',
    'Thesis Agent — draft thesis-level academic prose from the full project corpus.',
    'Produce a clear chapter-style draft with argument, aims, and contributions grounded in all materials.',
  ),
  wholeDocAgent(
    'dissertation',
    'Dissertation',
    'Dissertation Agent — draft comprehensive dissertation prose from the full corpus.',
    'Produce rigorous, well-structured dissertation prose grounded in all materials.',
  ),
]

/**
 * Resolve the specialist agent for a draft slot. Every publication section and
 * report type has a dedicated agent that reads overlapping materials.
 */
export function resolveSectionAgent(
  outputType: OutputType,
  section: string | null,
): SectionAgent {
  if (outputType === 'publication' && section) {
    const match = PUBLICATION_AGENTS.find((a) => a.section === section)
    if (match) {
      return {
        ...match,
        id: `publication:${section}`,
        outputType: 'publication',
      }
    }
    const checklist = getSectionChecklist(section)
    const citing = Boolean(checklist?.useInTextCitations)
    return {
      id: `publication:${section}`,
      outputType: 'publication',
      section,
      label: section,
      role: `${section} Agent — draft this publication section from filled sibling drafts, data, and literature.`,
      reads: PUBLICATION_FALLBACK_READS,
      useResearchApi: citing || Boolean(checklist?.useResearchApi),
      useInTextCitations: citing,
      guidance: buildGuidance(section),
    }
  }

  const whole = WHOLE_DOC_AGENTS.find((a) => a.outputType === outputType)
  if (whole) return whole

  return {
    id: outputType,
    outputType,
    section,
    label: outputType,
    role: 'Drafting Agent — write from the project materials.',
    reads: ALL_MATERIALS,
    useResearchApi: false,
    useInTextCitations: false,
    guidance: 'Write clear formal academic English as Markdown.',
  }
}

/** All known agents (for docs / debugging). */
export function listSectionAgents(): SectionAgent[] {
  return [
    ...PUBLICATION_AGENTS.map((a) => ({
      ...a,
      id: `publication:${a.section}`,
      outputType: 'publication' as const,
    })),
    ...WHOLE_DOC_AGENTS,
  ]
}
