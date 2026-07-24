import { fetchPapersForOutline } from '@/lib/research-api'
import {
  assembleProjectContext,
  type ProjectContext,
} from '@/components/research-note/context-providers'
import type { OutputType } from '@/components/research-note/storage/types'
import { getProjectCitationStyle } from '@/components/research-note/features/references/citationStyleSettings'
import type { CitationStyle } from '@/components/research-note/features/references/citation'
import {
  applyStyleToCiteSources,
  citeSourceFromPaper,
  formatCitationBank,
  loadProjectCiteSources,
  minCitationsForSection,
  type CiteSource,
} from './citationBank'
import {
  formatLaterSections,
  formatPriorSections,
  getFilledPublicationSections,
  sectionBodyText,
  titleFromPrior,
  type PriorSectionContent,
} from './priorSections'
import { resolveSectionAgent } from './registry'
import { formatSectionChecklist } from './sectionChecklists'
import { pickMaterial, type AgentBundle, type SectionAgent } from './types'

/** Sections that never receive in-text citations or research-API content. */
const NO_CITATION_SECTIONS = new Set(['Title', 'Abstract', 'Keywords'])

export interface LiteratureFetchResult {
  text: string
  count: number
  query: string
  sources: CiteSource[]
}

/** @deprecated use citationBank.apaParenthetical — kept for exports. */
export { apaParenthetical as apaInTextCite } from './citationBank'

function contentOf(
  sections: PriorSectionContent[],
  name: string,
): string {
  return sections.find((p) => p.section === name)?.content.trim() ?? ''
}

/** Build a focused search query from manuscript + project metadata. */
export function buildResearchQuery(
  project: Pick<ProjectContext, 'title' | 'focus'>,
  prior: PriorSectionContent[],
  later: PriorSectionContent[],
): string {
  const title = titleFromPrior(prior) || contentOf(later, 'Title') || project.title
  const abs = contentOf(prior, 'Abstract') || contentOf(later, 'Abstract')
  const keywords = contentOf(prior, 'Keywords') || contentOf(later, 'Keywords')

  const kw = keywords
    ? keywords
        .split(/[,;]+/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(' ')
    : ''

  // Prefer short topical queries (papers search works better than long abstracts).
  const parts = [
    title.slice(0, 160),
    kw,
    project.focus?.slice(0, 120) || '',
    !title && abs ? abs.slice(0, 120) : '',
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, ' ').trim())

  return parts.join(' ').trim().slice(0, 280)
}

/** Multiple complementary queries for a deeper literature pull. */
export function buildResearchQueries(
  project: Pick<ProjectContext, 'title' | 'focus'>,
  prior: PriorSectionContent[],
  later: PriorSectionContent[],
  section?: string | null,
): string[] {
  const title = (titleFromPrior(prior) || contentOf(later, 'Title') || project.title || '')
    .replace(/\s+/g, ' ')
    .trim()
  const abs = (contentOf(prior, 'Abstract') || contentOf(later, 'Abstract') || '')
    .replace(/\s+/g, ' ')
    .trim()
  const keywords = contentOf(prior, 'Keywords') || contentOf(later, 'Keywords')
  const kwList = keywords
    ? keywords
        .split(/[,;]+/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 6)
    : []
  const focus = (project.focus || '').replace(/\s+/g, ' ').trim()
  const primary = buildResearchQuery(project, prior, later)

  const queries: string[] = []
  const push = (q: string) => {
    const cleaned = q.replace(/\s+/g, ' ').trim().slice(0, 280)
    if (!cleaned) return
    if (queries.some((x) => x.toLowerCase() === cleaned.toLowerCase())) return
    queries.push(cleaned)
  }

  push(primary)
  if (title) push(title.slice(0, 180))
  if (kwList.length) push([...kwList.slice(0, 4), focus].filter(Boolean).join(' '))
  if (focus) push(`${focus} systematic review OR meta-analysis OR state of the art`)
  if (title && focus) push(`${title.slice(0, 100)} ${focus.slice(0, 100)}`)
  push(`${title || focus} research gap challenges limitations`.trim())
  push(`${kwList.slice(0, 3).join(' ') || focus} theoretical framework OR prior work`.trim())

  const sec = section || ''
  if (sec === 'Discussion' || sec === 'Results') {
    push(`${title || focus} findings implications controversy empirical`.trim())
  }
  if (sec === 'Materials & Methods') {
    push(`${kwList.slice(0, 3).join(' ') || focus} methodology methods protocol`.trim())
  }
  if (sec === 'Conclusion' || sec === 'Acknowledgements' || sec === 'Supplementary') {
    push(`${title || focus} future directions contribution`.trim())
  }
  if (!queries.length && abs) push(abs.slice(0, 200))

  return queries.slice(0, 5)
}

/** High paper bank for every section that uses the research API. */
function paperCapForSection(_section?: string | null): number {
  return 30
}

function perQueryLimit(_section?: string | null): number {
  return 12
}

/**
 * Fetch related papers from the GAHI research/papers API and build a
 * CITATION BANK with exact APA strings for Introduction and other body sections.
 * Uses multiple queries so sections get a deeper literature set, not a thin sample.
 */
export async function fetchResearchLiterature(
  project: Pick<ProjectContext, 'title' | 'focus'>,
  priorTitle?: string,
  priorAbstract?: string,
  prior?: PriorSectionContent[],
  later?: PriorSectionContent[],
  projectId?: string,
  section?: string | null,
): Promise<LiteratureFetchResult> {
  const queries =
    prior && later
      ? buildResearchQueries(project, prior, later, section)
      : [
          [priorTitle, project.focus, !priorTitle ? project.title : '', priorAbstract?.slice(0, 120)]
            .filter(Boolean)
            .join(' ')
            .trim()
            .slice(0, 280),
        ].filter(Boolean)

  if (queries.length === 0) return { text: '', count: 0, query: '', sources: [] }

  const queryLabel = queries.join(' | ')
  const cap = paperCapForSection(section)
  const qLimit = perQueryLimit(section)
  const style: CitationStyle = projectId
    ? await getProjectCitationStyle(projectId)
    : 'apa-7'

  try {
    const [paperBatches, projectRefs] = await Promise.all([
      Promise.all(queries.map((q) => fetchPapersForOutline(q, qLimit))),
      projectId ? loadProjectCiteSources(projectId, style) : Promise.resolve([]),
    ])

    const paperHits: NonNullable<Awaited<ReturnType<typeof fetchPapersForOutline>>> = []
    const seenTitles = new Set<string>()
    for (const batch of paperBatches) {
      for (const paper of batch ?? []) {
        const key = paper.title.toLowerCase()
        if (seenTitles.has(key)) continue
        seenTitles.add(key)
        paperHits.push(paper)
        if (paperHits.length >= cap) break
      }
      if (paperHits.length >= cap) break
    }

    const apiSources = paperHits.map((p, i) => citeSourceFromPaper(p, i, style))
    const seen = new Set(apiSources.map((s) => s.title.toLowerCase()))
    const libraryBudget = Math.max(8, Math.min(15, cap - apiSources.length))
    const extra = projectRefs
      .filter((r) => !seen.has(r.title.toLowerCase()))
      .slice(0, libraryBudget)
    const sources = applyStyleToCiteSources(
      [...apiSources, ...extra].slice(0, cap),
      style,
    )

    if (sources.length === 0) return { text: '', count: 0, query: queryLabel, sources: [] }

    const minCites = minCitationsForSection(section || '', sources.length)
    return {
      text: formatCitationBank(sources, queryLabel, {
        section: section || undefined,
        minCites,
        style,
      }),
      count: apiSources.length || sources.length,
      query: queryLabel,
      sources,
    }
  } catch {
    return { text: '', count: 0, query: queryLabel, sources: [] }
  }
}

/**
 * Multi-agent orchestrator: resolve the section agent, read the existing
 * write-up + every other filled section, assemble notebook materials, and
 * pull research API literature as a citation bank for body sections.
 */
export async function orchestrateSectionDraft(
  projectId: string,
  outputType: OutputType,
  section: string | null,
  existingContent?: string | null,
): Promise<{ ctx: ProjectContext; bundle: AgentBundle }> {
  const agent = resolveSectionAgent(outputType, section)
  const normalizedExisting = existingContent?.trim()
    ? sectionBodyText(section, existingContent)
    : ''
  const mode = normalizedExisting ? 'refine' : 'create'

  const [ctx, filled] = await Promise.all([
    assembleProjectContext(projectId, {
      excludeDraft: { outputType, section },
    }),
    outputType === 'publication' && section
      ? getFilledPublicationSections(projectId, section)
      : Promise.resolve({ prior: [], later: [] }),
  ])

  const priorSections = filled.prior
  const laterSections = filled.later

  const prioritized = pickMaterial(ctx.agents, agent.reads)
  // Publication sections must not fall back to full notebook Materials (notes).
  const prioritizedMaterial =
    outputType === 'publication'
      ? prioritized
      : prioritized || ctx.material

  const needsLit =
    agent.useResearchApi ||
    (agent.useInTextCitations &&
      Boolean(section) &&
      !NO_CITATION_SECTIONS.has(section!))

  const lit = needsLit
    ? await fetchResearchLiterature(
        ctx,
        titleFromPrior(priorSections),
        contentOf(priorSections, 'Abstract') || contentOf(laterSections, 'Abstract'),
        priorSections,
        laterSections,
        projectId,
        section,
      )
    : { text: '', count: 0, query: '', sources: [] as CiteSource[] }

  return {
    ctx,
    bundle: {
      target: agent,
      prioritizedMaterial,
      priorSections,
      laterSections,
      existingContent: normalizedExisting || null,
      mode,
      literature: lit.text,
      literatureCount: lit.count,
      citeSources: lit.sources,
    },
  }
}

function citationInstructions(
  agent: SectionAgent,
  _literatureCount: number,
  section: string | null,
  sourceCount: number,
): string {
  if (!agent.useInTextCitations || !agent.section) return ''
  if (NO_CITATION_SECTIONS.has(agent.section)) return ''

  if (sourceCount <= 0) {
    return [
      `Research API returned no papers for "${agent.label}".`,
      'Generate from the user write-up and notebook materials only.',
      'Use APA (Author, Year) only from project References if listed. Never invent citations.',
    ].join(' ')
  }

  const minCites = minCitationsForSection(section || agent.section, sourceCount)

  return [
    `CITATION BANK: ${sourceCount} source(s) listed below with exact APA strings (deep literature dive).`,
    `For "${agent.label}", you MUST insert at least ${minCites} distinct in-text citations by copying the "USE THIS CITE" strings exactly (e.g. (Smith, 2021)).`,
    'Synthesise across MANY bank sources — themes, methods, findings, and disagreements — do not lean on only a few papers.',
    'Place a citation after every sentence that states prior research, a gap, a definition from literature, or a comparison to prior work.',
    'Introduction especially: cite when stating the problem significance, the knowledge gap, and related prior approaches, drawing on a broad set of bank entries.',
    'Literature Review especially: organise by theme and cite multiple sources per theme; avoid one-paper-per-paragraph catalogues.',
    'When refining, keep the user write-up as the spine and ADD missing citations from the bank until the minimum is met.',
    'Never invent authors or years. Bibliography entries are saved automatically to Manuscript → References.',
  ].join(' ')
}

export function buildAgentPrompt(
  ctx: ProjectContext,
  bundle: AgentBundle,
): { system: string; user: string } {
  const agent: SectionAgent = bundle.target
  const target = agent.section
    ? `${agent.label} section`
    : agent.label

  const priorNames = bundle.priorSections.map((p) => p.section)
  const laterNames = bundle.laterSections.map((p) => p.section)
  const allSiblingNames = [...priorNames, ...laterNames]
  const refining = bundle.mode === 'refine' && bundle.existingContent
  const sourceCount = bundle.citeSources.length
  const hasLiterature = sourceCount > 0
  const citeNote = citationInstructions(
    agent,
    bundle.literatureCount,
    agent.section,
    sourceCount,
  )
  const minCites = minCitationsForSection(agent.section || '', sourceCount)

  const cascadeNote =
    agent.section && allSiblingNames.length > 0
      ? [
          'Before drafting, you checked every publication section that already has input.',
          priorNames.length
            ? `Earlier sections: ${priorNames.join(' → ')}.`
            : 'No earlier sections are filled yet.',
          laterNames.length
            ? `Later sections already written: ${laterNames.join(' → ')}.`
            : '',
          'Stay on that write-up: reuse the same topic, variables, aims, methods language, and claims. Do not drift into a different study.',
        ]
          .filter(Boolean)
          .join(' ')
      : agent.section
        ? 'No other publication sections have content yet. Ground this section in Data, Figures, Lab Log, References, sibling drafts, and research API papers — do not pull from notebook Materials. Stay on the project focus.'
        : ''

  const refineNote = refining
    ? [
        `The user already has a write-up for "${agent.label}". That existing text is the primary spine.`,
        'REFINE it until EVERY item on the reader checklist is covered.',
        'Improve clarity, structure, and academic tone.',
        "Keep the author's topic, facts, claims, numbers, and intent.",
        'Do not rewrite into a different paper, invent new results, or change the research question.',
        agent.useInTextCitations && hasLiterature
          ? `Add APA in-text citations from the CITATION BANK (at least ${minCites} distinct cites).`
          : 'Only add detail that is already supported by other filled sections, data, figures, or lab log.',
      ].join(' ')
    : agent.section
      ? agent.useResearchApi
        ? `The "${agent.label}" section is empty. GENERATE it covering EVERY reader-checklist item, using research API papers as primary scholarly evidence, with APA in-text citations from the CITATION BANK.`
        : `The "${agent.label}" section is empty. GENERATE it covering EVERY reader-checklist item from other filled sections, data, figures, and lab log.`
      : ''

  const checklistBlock = agent.section ? formatSectionChecklist(agent.section) : ''

  const system = [
    'You are part of a multi-agent research notebook system (CanvAtlas), aligned with GAHI /research chat-paper conventions.',
    `Your role: ${agent.role}`,
    'Alignment rule: always check the existing write-up for this section (if any) and every other section that already has input.',
    'Section cascade: Title first, then Abstract if present, then every other filled section (earlier and later).',
    cascadeNote,
    refineNote,
    citeNote,
    hasLiterature
      ? `CRITICAL CITATION RULE: Copy cite strings from the CITATION BANK into the prose. Minimum ${minCites} distinct bank citations required for this section.`
      : '',
    'Do NOT use notebook Materials (notes pages) as source content for this section.',
    'When Data and/or Figures are present in Connected project evidence, Title and Abstract MUST reflect that study content (topic variables from columns/figures; Abstract key findings from the data).',
    'Results MUST cite available Figures by name and report values from Data tables only.',
    'Ground every claim in the write-ups, data/figures/lab log when provided, and listed literature. Do not invent data, results, or citations.',
    'If evidence is insufficient, note what is missing rather than fabricating.',
    'Write clear formal academic English. Format as Markdown with appropriate headings unless the slot is Title or Keywords (plain text only).',
    'Do not use em dashes or en dashes. Use commas, colons, parentheses, or hyphens (-) instead.',
    'Do not add a References or bibliography section.',
    agent.section
      ? `CRITICAL: Output ONLY the "${agent.label}" section. Do not output any other manuscript sections, outlines, or placeholders for other sections.`
      : '',
    'CRITICAL: Capture every bullet on the reader checklist for this section before finishing.',
    agent.guidance,
  ]
    .filter(Boolean)
    .join(' ')

  const existingBlock = refining
    ? [
        `## Existing write-up for ${agent.label} (PRIMARY spine, refine, do not abandon)`,
        bundle.existingContent,
        '',
      ].join('\n')
    : ''

  const priorBlock = formatPriorSections(bundle.priorSections)
  const laterBlock = formatLaterSections(bundle.laterSections)

  const researchAction = hasLiterature
    ? ` Use the CITATION BANK (${sourceCount} sources) and include at least ${minCites} distinct APA in-text citations copied exactly.`
    : agent.useInTextCitations
      ? ' Research API returned no papers. Use sibling drafts, data/figures/lab log, and project References only — not notebook Materials.'
      : ''

  const checklistAction =
    ' Ensure EVERY reader-checklist item for this section is present in the output.'

  const actionLine = agent.section
    ? refining
      ? allSiblingNames.length > 0
        ? `Now REFINE ONLY the **${target}**. Start from the existing write-up. Cross-check filled sections (${allSiblingNames.join(', ')}).${researchAction}${checklistAction} Output the improved section only. No commentary.`
        : `Now REFINE ONLY the **${target}**. Start from the existing write-up.${researchAction}${checklistAction} Output the improved section only. No commentary.`
      : allSiblingNames.length > 0
        ? `Now write ONLY the **${target}**. Align with filled sections (${allSiblingNames.join(', ')}).${researchAction}${checklistAction}`
        : `Now write ONLY the **${target}**.${researchAction}${checklistAction}`
    : `Now write the **${target}**. Coordinate with sibling drafts already present so the manuscript stays consistent.`

  const materialsBlock = [
    '## Connected project evidence (capture order: Materials, Data, Figures, Lab Log, Progress Reports, manuscript drafts — Materials excluded from section prose)',
    bundle.prioritizedMaterial ||
      '_(No Materials, Data, Figures, Lab Log, Progress Reports, or manuscript sections captured yet.)_',
  ].join('\n')

  const literatureBlock = bundle.literature ? `${bundle.literature}\n` : ''

  const userParts =
    agent.useResearchApi || agent.useInTextCitations
      ? [
          `# Project: ${ctx.title}`,
          ctx.focus ? `Research focus: ${ctx.focus}` : '',
          '',
          checklistBlock,
          '',
          existingBlock,
          priorBlock,
          laterBlock,
          literatureBlock,
          materialsBlock,
          '',
          ctx.template
            ? `## Style & structure exemplar\nImitate structure/formatting only, not content.\n\n${ctx.template}\n`
            : '',
          actionLine,
        ]
      : [
          `# Project: ${ctx.title}`,
          ctx.focus ? `Research focus: ${ctx.focus}` : '',
          '',
          checklistBlock,
          '',
          existingBlock,
          priorBlock,
          laterBlock,
          materialsBlock,
          '',
          literatureBlock,
          ctx.template
            ? `## Style & structure exemplar\nImitate structure/formatting only, not content.\n\n${ctx.template}\n`
            : '',
          actionLine,
        ]

  const user = userParts.filter(Boolean).join('\n')

  return { system, user }
}

/** Prompt for a second pass that only inserts missing bank citations. */
export function buildCitationFixPrompt(
  section: string,
  draft: string,
  sources: CiteSource[],
): { system: string; user: string } {
  const minCites = minCitationsForSection(section, sources.length)
  const bank = formatCitationBank(sources, 'citation-fix')
  const system = [
    'You are a citation editor for an academic manuscript section.',
    `Insert APA in-text citations into the ${section} draft using ONLY the CITATION BANK.`,
    `Copy cite strings exactly (e.g. (Smith, 2021)). Require at least ${minCites} distinct bank citations.`,
    'Do not invent sources. Do not change the study topic or invent findings.',
    'Preserve the author voice and structure. Prefer adding cites after literature claims, gap statements, and problem framing.',
    'Do not use em dashes. Do not add a References bibliography.',
    `Output ONLY the revised ${section} section as Markdown. No commentary.`,
  ].join(' ')

  const user = [
    bank,
    '',
    `## Draft to cite (${section})`,
    draft,
    '',
    `Return the full ${section} with in-text citations added. Minimum ${minCites} distinct cites from the bank.`,
  ].join('\n')

  return { system, user }
}
