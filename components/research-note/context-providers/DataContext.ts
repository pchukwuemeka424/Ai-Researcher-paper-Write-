import { listDatasets } from '@/components/research-note/storage/repositories'
import { datasetSummary, datasetToTable } from './extractors'

/** Cap rows sent to the model so a huge sheet doesn't blow the context window. */
const MAX_ROWS = 50

/** DataContext — datasets rendered as readable tables + summaries for the AI. */
export async function getDataContext(projectId: string): Promise<string> {
  const datasets = await listDatasets(projectId)
  if (datasets.length === 0) return ''
  const blocks = datasets.map((d) => {
    const capped =
      d.rows.length > MAX_ROWS ? { ...d, rows: d.rows.slice(0, MAX_ROWS) } : d
    const note =
      d.rows.length > MAX_ROWS
        ? `\n_(showing first ${MAX_ROWS} of ${d.rows.length} rows)_`
        : ''
    return `### ${datasetSummary(d)}\n\n${datasetToTable(capped)}${note}`
  })
  return [
    '## Data',
    '',
    'Empirical datasets from this research note. Use them to ground Title, Abstract, Methods, Results, and Discussion.',
    'Only report numbers that appear in these tables (or clear aggregates of them). Do not invent values.',
    '',
    blocks.join('\n\n'),
  ].join('\n')
}
