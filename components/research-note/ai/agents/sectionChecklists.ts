/**
 * Section checklists for Research Note publication agents.
 * Mirrors /research chat-paper + outline expectations so Generate/Refine
 * covers what readers look for in each IMRaD section.
 */

export interface SectionChecklist {
  section: string
  /** Target length for Generate/Refine. */
  wordTarget: string
  /** Must-cover bullets (reader expectations). */
  mustCover: string[]
  /** Soft rules / what to avoid. */
  avoid: string[]
  /** Whether research API + APA in-text cites apply. */
  useResearchApi: boolean
  useInTextCitations: boolean
}

export const SECTION_CHECKLISTS: Record<string, SectionChecklist> = {
  Title: {
    section: 'Title',
    wordTarget: '8–20 words (one line)',
    mustCover: [
      'Specific, academic title that names the study topic',
      'Reflect variables / population / outcome visible in Data or Figures when present',
      'Aligned with Abstract and project focus',
    ],
    avoid: [
      'Citations',
      'Questions as the only form unless conventional in the field',
      'Ignoring Data/Figures when they define the study',
    ],
    useResearchApi: false,
    useInTextCitations: false,
  },
  Abstract: {
    section: 'Abstract',
    wordTarget: '150–250 words',
    mustCover: [
      'Background / problem in 1–2 sentences',
      'Aim of the study',
      'Methods (brief)',
      'Key findings grounded in Data tables and/or named Figures when present',
      'Conclusion / implication',
    ],
    avoid: [
      'In-text citations',
      'References list',
      'Detailed results tables',
      'Inventing numeric findings not present in Data / Figures / Lab Log',
    ],
    useResearchApi: false,
    useInTextCitations: false,
  },
  Keywords: {
    section: 'Keywords',
    wordTarget: '5–8 terms',
    mustCover: [
      'Searchable terms drawn from Title, Abstract, Data column themes, and Figures',
    ],
    avoid: ['Prose paragraphs', 'Citations'],
    useResearchApi: false,
    useInTextCitations: false,
  },
  Introduction: {
    section: 'Introduction',
    wordTarget: '700–1,200 words',
    mustCover: [
      'What problem is this? Why does it matter now?',
      'Gap in knowledge / what is missing (grounded in multiple cited sources)',
      'Aim, objectives, or research questions',
      'Brief preview of contribution (not full results)',
      'Scope / roadmap of the paper',
      'Deep literature grounding: cite many bank sources across problem, prior approaches, and gap',
    ],
    avoid: [
      'Folding into Abstract or Literature Review',
      'Full results dump',
      'Thin citation (only 2–3 sources when more are available)',
      'Invented citations',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  'Literature Review': {
    section: 'Literature Review',
    wordTarget: '1,200–2,200 words',
    mustCover: [
      'What is already known (themes synthesised across many sources, not a book list)',
      'Debates, methods used before, key findings, and disagreements in the field',
      'How this study fits and advances prior work',
      'Clear gap that justifies the study',
      'Broad coverage: cite a large share of the citation bank across themes',
    ],
    avoid: [
      'Annotated bibliography style (one paper per paragraph with no synthesis)',
      'Relying on only a handful of sources when many are available',
      'Invented sources',
      'Changing the research gap from Title/Abstract/Introduction',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  'Materials & Methods': {
    section: 'Materials & Methods',
    wordTarget: '600–1,200 words',
    mustCover: [
      'Who/what was studied (sample, setting, materials)',
      'How data were collected and analysed',
      'Enough detail to judge rigor / reproducibility',
      'Ethics, instruments, software, stats (as relevant)',
    ],
    avoid: [
      'Interpreting results',
      'Inventing procedures not in Lab Log / notes / data',
      'Invented citations',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  Results: {
    section: 'Results',
    wordTarget: '600–1,200 words',
    mustCover: [
      'What was found — facts first, little interpretation',
      'Clear link to aims/questions',
      'Report numbers and patterns from Data tables (do not invent values)',
      'Reference each available Figure by name (e.g. Figure 1: …) and describe what it shows',
      'Tables/figures that carry the main findings',
      'No new methods; no big “so what” yet',
    ],
    avoid: [
      'Inventing numbers not in Data / Lab Log / Figures',
      'Ignoring saved Figures when they exist',
      'Full discussion / implications',
      'New methods not stated in Materials & Methods',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  Discussion: {
    section: 'Discussion',
    wordTarget: '900–1,600 words',
    mustCover: [
      'What the results mean',
      'Agreement/disagreement with prior work (cite many bank sources, not a few)',
      'Limitations and alternative explanations',
      'Implications for theory, practice, or policy',
      'What should come next',
    ],
    avoid: [
      'Repeating Results without interpretation',
      'Thin comparison to prior work',
      'Inventing findings or sources',
      'Ignoring Title/Abstract/Introduction aims',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  Conclusion: {
    section: 'Conclusion',
    wordTarget: '150–400 words',
    mustCover: [
      'Short wrap-up of main contribution',
      'Take-home message for the field',
      'Optional: 1–2 forward-looking points',
    ],
    avoid: [
      'New data',
      'Long literature rehash',
      'New claims not supported earlier',
    ],
    useResearchApi: true,
    useInTextCitations: true,
  },
  References: {
    section: 'References',
    wordTarget: 'one entry per cited source',
    mustCover: [
      'APA-style bibliography entries for every source cited in the manuscript',
      'Linked titles when a URL is available',
      'Updated when new cites appear or existing source metadata changes',
    ],
    avoid: [
      'In-text citation prose',
      'Invented sources not used in body sections',
      'Manual regenerate without scanning body cites (prefer auto-sync)',
    ],
    useResearchApi: false,
    useInTextCitations: false,
  },
  Acknowledgements: {
    section: 'Acknowledgements',
    wordTarget: '50–150 words',
    mustCover: [
      'Funders, institutions, helpers, reviewers (if allowed / known from notes)',
      'Conflicts of interest / thanks only when stated',
    ],
    avoid: ['Science claims', 'Citations', 'Inventing names/funders'],
    useResearchApi: false,
    useInTextCitations: false,
  },
  Supplementary: {
    section: 'Supplementary',
    wordTarget: 'as needed (concise list)',
    mustCover: [
      'Extra tables, figures, protocols, code, raw appendices',
      'Material that supports the paper but is not needed in the main narrative',
    ],
    avoid: ['Duplicating the full Results narrative', 'Invented assets'],
    useResearchApi: false,
    useInTextCitations: false,
  },
}

/** Format checklist as prompt instructions (mirrors /research outline depth). */
export function formatSectionChecklist(section: string): string {
  const c = SECTION_CHECKLISTS[section]
  if (!c) return ''

  const cover = c.mustCover.map((item, i) => `${i + 1}. ${item}`).join('\n')
  const avoid = c.avoid.map((item) => `- ${item}`).join('\n')

  return [
    `## Reader checklist for ${c.section} (must capture all)`,
    `Target length: ${c.wordTarget}.`,
    'Cover EVERY point below in the draft (or refine until each is present):',
    cover,
    'Avoid:',
    avoid,
    c.useInTextCitations
      ? 'Use APA 7 author-date in-text citations (Author, Year) from research API papers and project References for every substantive literature claim, same convention as /research chat-paper. Deep dive with a large citation bank (~30 papers): Introduction/Discussion ≥10 distinct cites, Literature Review ≥14, other body sections ≥5–6 when the bank is large enough — synthesise across many sources.'
      : 'Do not add in-text citations in this section.',
  ].join('\n')
}

export function getSectionChecklist(section: string): SectionChecklist | null {
  return SECTION_CHECKLISTS[section] ?? null
}
