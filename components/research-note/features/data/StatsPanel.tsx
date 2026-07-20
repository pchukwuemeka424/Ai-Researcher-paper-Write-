import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { useCloudSave } from '@/components/research-note/features/sync/CloudSave'
import { createAsset } from '@/components/research-note/storage/repositories'
import type { CellValue, Dataset } from '@/components/research-note/storage/types'
import {
  chiSquareIndependence,
  correlation,
  describe,
  formatP,
  linearRegression,
  oneSampleTTest,
  oneWayAnova,
  pairedTTest,
  spearman,
  StatsError,
  welchTTest,
} from './stats'

type Analysis =
  | 'descriptives'
  | 'correlation'
  | 'spearman'
  | 'regression'
  | 'ttest'
  | 'pairedttest'
  | 'onesamplettest'
  | 'anova'
  | 'chisquare'

const ANALYSES: { key: Analysis; label: string }[] = [
  { key: 'descriptives', label: 'Descriptives' },
  { key: 'correlation', label: 'Correlation (Pearson)' },
  { key: 'spearman', label: 'Correlation (Spearman)' },
  { key: 'regression', label: 'Linear regression' },
  { key: 'ttest', label: 't-test (2 groups)' },
  { key: 'pairedttest', label: 'Paired t-test' },
  { key: 'onesamplettest', label: 'One-sample t-test' },
  { key: 'anova', label: 'One-way ANOVA' },
  { key: 'chisquare', label: 'Chi-square (categorical)' },
]

function columnValues(dataset: Dataset, colId: string): CellValue[] {
  return dataset.rows.map((r) => r.cells[colId] ?? null)
}

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(Math.abs(n) < 1 ? 4 : 3)

export type StatsPanelHandle = {
  saveToFigures: () => Promise<void>
  canSave: () => boolean
}

export const StatsPanel = forwardRef<
  StatsPanelHandle,
  {
    dataset: Dataset
    projectId: string
    onSavedToFigures?: (message: string) => void
  }
>(function StatsPanel({ dataset, projectId, onSavedToFigures }, ref) {
  const cloud = useCloudSave()
  const cols = dataset.columns
  const numericCols = cols.filter((c) => c.type === 'number')
  const [analysis, setAnalysis] = useState<Analysis>('descriptives')
  const [colA, setColA] = useState('')
  const [colB, setColB] = useState('')
  const [mu, setMu] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Resolve selected columns, falling back to sensible defaults.
  const a = colA || numericCols[0]?.id || ''
  const b = colB || numericCols[1]?.id || numericCols[0]?.id || ''
  const groupCol = colB || cols.find((c) => c.type === 'text')?.id || ''
  // Chi-square works on any two categorical columns.
  const catA = colA || cols[0]?.id || ''
  const catB = colB || cols[1]?.id || cols[0]?.id || ''

  const result = useMemo(() => {
    try {
      if (analysis === 'descriptives') {
        if (!a) throw new StatsError('Pick a numeric column.')
        const d = describe(columnValues(dataset, a))
        return {
          rows: [
            ['n', String(d.n)],
            ['Mean', fmt(d.mean)],
            ['95% CI (mean)', `${fmt(d.ci95lo)} – ${fmt(d.ci95hi)}`],
            ['Std error', fmt(d.se)],
            ['Median', fmt(d.median)],
            ['Std dev (sample)', fmt(d.sd)],
            ['Min', fmt(d.min)],
            ['Q1', fmt(d.q1)],
            ['Q3', fmt(d.q3)],
            ['IQR', fmt(d.iqr)],
            ['Max', fmt(d.max)],
            ['Skewness', fmt(d.skewness)],
            ['Sum', fmt(d.sum)],
          ],
        }
      }
      if (analysis === 'correlation') {
        const r = correlation(columnValues(dataset, a), columnValues(dataset, b))
        return {
          rows: [
            ['Pearson r', fmt(r.r)],
            ['R²', fmt(r.r2)],
            ['n (paired)', String(r.n)],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      if (analysis === 'spearman') {
        const r = spearman(columnValues(dataset, a), columnValues(dataset, b))
        return {
          rows: [
            ['Spearman ρ', fmt(r.rho)],
            ['n (paired)', String(r.n)],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      if (analysis === 'pairedttest') {
        const r = pairedTTest(columnValues(dataset, a), columnValues(dataset, b))
        return {
          rows: [
            ['Mean difference', fmt(r.meanDiff)],
            ['t', fmt(r.t)],
            ['df', fmt(r.df)],
            ['n (pairs)', String(r.n)],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      if (analysis === 'onesamplettest') {
        const r = oneSampleTTest(columnValues(dataset, a), mu)
        return {
          rows: [
            ['Mean', fmt(r.mean)],
            ['Test value μ', fmt(r.mu)],
            ['t', fmt(r.t)],
            ['df', fmt(r.df)],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      if (analysis === 'chisquare') {
        const r = chiSquareIndependence(columnValues(dataset, catA), columnValues(dataset, catB))
        return {
          rows: [
            ['χ²', fmt(r.chi2)],
            ['df', String(r.df)],
            ['Rows × Cols', `${r.rows.length} × ${r.cols.length}`],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      if (analysis === 'regression') {
        const r = linearRegression(columnValues(dataset, a), columnValues(dataset, b))
        return {
          rows: [
            ['Equation', `y = ${fmt(r.slope)}·x + ${fmt(r.intercept)}`],
            ['Slope', fmt(r.slope)],
            ['Intercept', fmt(r.intercept)],
            ['R²', fmt(r.r2)],
            ['n', String(r.n)],
          ],
        }
      }
      if (analysis === 'ttest') {
        const r = welchTTest(columnValues(dataset, a), columnValues(dataset, b))
        return {
          rows: [
            ['Mean A', fmt(r.meanA)],
            ['Mean B', fmt(r.meanB)],
            ['t', fmt(r.t)],
            ['df', fmt(r.df)],
            ['Significance', formatP(r.p)],
          ],
        }
      }
      // ANOVA: value column `a` grouped by label column `groupCol`.
      if (!a || !groupCol) throw new StatsError('Pick a value column and a group column.')
      const groups = new Map<string, CellValue[]>()
      dataset.rows.forEach((row) => {
        const label = String(row.cells[groupCol] ?? '')
        if (label === '') return
        if (!groups.has(label)) groups.set(label, [])
        groups.get(label)!.push(row.cells[a] ?? null)
      })
      const r = oneWayAnova([...groups.values()])
      return {
        rows: [
          ['Groups', [...groups.keys()].join(', ')],
          ['F', fmt(r.f)],
          ['df between', String(r.dfBetween)],
          ['df within', String(r.dfWithin)],
          ['Significance', formatP(r.p)],
        ],
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not compute.' }
    }
  }, [analysis, a, b, groupCol, catA, catB, mu, dataset])

  const needsTwo =
    analysis === 'correlation' ||
    analysis === 'spearman' ||
    analysis === 'regression' ||
    analysis === 'ttest' ||
    analysis === 'pairedttest'
  const isAnova = analysis === 'anova'
  const isChi = analysis === 'chisquare'
  const isOneSample = analysis === 'onesamplettest'
  const firstLabel = isAnova
    ? 'Value'
    : analysis === 'ttest'
      ? 'Group A'
      : analysis === 'pairedttest'
        ? 'Column 1'
        : analysis === 'descriptives' || isOneSample
          ? 'Column'
          : 'X'

  const analysisLabel = ANALYSES.find((o) => o.key === analysis)?.label ?? 'Statistics'

  useImperativeHandle(ref, () => ({
    canSave: () => !('error' in result) && Boolean(resultsRef.current),
    saveToFigures: async () => {
      if ('error' in result || !resultsRef.current) {
        throw new Error('No statistics to save. Run an analysis first.')
      }
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png'),
      )
      if (!blob) throw new Error('Could not capture statistics image.')
      const stem =
        `${dataset.name} ${analysisLabel}`
          .replace(/[^\w\s\-]+/g, '')
          .trim() || 'statistics'
      await createAsset({
        projectId,
        name: `${stem}.png`,
        mime: 'image/png',
        blob,
      })
      await cloud.saveNow()
      onSavedToFigures?.('Statistics saved to Figures.')
    },
  }), [result, analysisLabel, dataset.name, projectId, cloud, onSavedToFigures])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {ANALYSES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setAnalysis(opt.key)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium',
              analysis === opt.key
                ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
                : 'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-border)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {isChi ? (
          <>
            <ColumnSelect label="Column A" value={catA} onChange={setColA} columns={cols} />
            <ColumnSelect label="Column B" value={catB} onChange={setColB} columns={cols} />
          </>
        ) : (
          <>
            <ColumnSelect label={firstLabel} value={a} onChange={setColA} columns={numericCols} />
            {needsTwo && (
              <ColumnSelect
                label={analysis === 'ttest' ? 'Group B' : analysis === 'pairedttest' ? 'Column 2' : 'Y'}
                value={b}
                onChange={setColB}
                columns={numericCols}
              />
            )}
            {isOneSample && (
              <label className="flex items-center gap-1.5">
                <span className="text-[var(--color-muted)]">Test value μ</span>
                <input
                  type="number"
                  value={mu}
                  onChange={(e) => setMu(Number(e.target.value) || 0)}
                  className="w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
                />
              </label>
            )}
            {isAnova && (
              <ColumnSelect label="Group by" value={groupCol} onChange={setColB} columns={cols} />
            )}
          </>
        )}
      </div>

      {'error' in result ? (
        <p className="rounded-lg bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
          {result.error}
        </p>
      ) : (
        <div ref={resultsRef} className="rounded-lg bg-[var(--color-canvas)] p-3">
          <p className="mb-2 text-sm font-semibold text-[var(--color-ink)]">{analysisLabel}</p>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
            {result.rows.map(([k, v]) => (
              <div key={k} className="bg-[var(--color-canvas)] px-3 py-2">
                <dt className="text-xs text-[var(--color-muted)]">{k}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
})

function ColumnSelect({
  label,
  value,
  onChange,
  columns,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  columns: { id: string; name: string }[]
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[var(--color-muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
      >
        {columns.length === 0 && <option value="">—</option>}
        {columns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}
