export type { MaterialSource, SectionAgent, AgentBundle, PriorSectionSnapshot } from './types'
export { pickMaterial } from './types'
export { resolveSectionAgent, listSectionAgents } from './registry'
export {
  getPriorPublicationSections,
  getFilledPublicationSections,
  formatPriorSections,
  formatLaterSections,
  titleFromPrior,
  sectionBodyText,
} from './priorSections'
export {
  SECTION_CHECKLISTS,
  formatSectionChecklist,
  getSectionChecklist,
} from './sectionChecklists'
export {
  citeSourceFromPaper,
  formatCitationBank,
  countBankCitations,
  findUsedCiteSources,
  sourcesForReferenceSync,
  formatReferenceEntry,
  minCitationsForSection,
  apaParenthetical,
  apaNarrative,
} from './citationBank'
export type { CiteSource } from './citationBank'
export { syncPublicationReferences } from './syncPublicationReferences'
export { applyCitationStyleToPublication } from './applyCitationStyle'
export {
  orchestrateSectionDraft,
  buildAgentPrompt,
  buildCitationFixPrompt,
  fetchResearchLiterature,
  buildResearchQuery,
  apaInTextCite,
} from './orchestrator'
