import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  ScatterController,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import {
  BoxAndWiskers,
  BoxPlotController,
} from '@sgratzl/chartjs-chart-boxplot'
import { Bar, Chart, Doughnut, Line, Pie, Scatter } from 'react-chartjs-2'
import { useCloudSave } from '@/components/research-note/features/sync/CloudSave'
import { createAsset } from '@/components/research-note/storage/repositories'
import type { CellValue, Dataset } from '@/components/research-note/storage/types'
import { cleanNumbers } from './stats'

// Register only what we use — tree-shaking stays effective.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  ScatterController,
  PieController,
  DoughnutController,
  BoxPlotController,
  BoxAndWiskers,
  Filler,
  Tooltip,
  Legend,
  Title,
)

type ChartType = 'bar' | 'line' | 'area' | 'scatter' | 'histogram' | 'box' | 'pie' | 'doughnut'

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'area', label: 'Area' },
  { key: 'scatter', label: 'Scatter' },
  { key: 'histogram', label: 'Histogram' },
  { key: 'box', label: 'Box plot' },
  { key: 'pie', label: 'Pie' },
  { key: 'doughnut', label: 'Doughnut' },
]

/** A categorical palette for pie/doughnut slices. */
const PALETTE = [
  '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

const hexToSoft = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.5)`
}

const values = (d: Dataset, colId: string): CellValue[] =>
  d.rows.map((r) => r.cells[colId] ?? null)

export type ChartPanelHandle = {
  /** Capture the visible chart as a PNG blob for saving to Figures / DB. */
  capturePng: () => Promise<Blob | null>
  /** Suggested filename stem (no extension). */
  suggestedName: () => string
  hasChart: () => boolean
  /** Save the visible chart into Figures and sync. */
  saveToFigures: () => Promise<void>
}

export const ChartPanel = forwardRef<
  ChartPanelHandle,
  { dataset: Dataset; projectId: string; onSavedToFigures?: (message: string) => void }
>(function ChartPanel({ dataset, projectId, onSavedToFigures }, ref) {
  const cloud = useCloudSave()
  const cols = dataset.columns
  const numericCols = cols.filter((c) => c.type === 'number')
  const [type, setType] = useState<ChartType>('bar')
  const [xCol, setXCol] = useState('')
  const [yCol, setYCol] = useState('')
  const [bins, setBins] = useState(10)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#4f46e5')
  const chartInstanceRef = useRef<ChartJS | null>(null)

  const fileStem = () => {
    const base = title.trim() || `${dataset.name} ${type} chart`
    return base.replace(/[^\w\s\-]+/g, '').trim() || 'chart'
  }

  const capturePngBlob = async (): Promise<Blob | null> => {
    const instance = chartInstanceRef.current
    if (!instance) return null
    instance.update('none')
    const dataUrl = instance.toBase64Image('image/png', 1)
    const res = await fetch(dataUrl)
    return res.blob()
  }

  const x = xCol || cols[0]?.id || ''
  const y = yCol || numericCols[0]?.id || ''
  const colName = (id: string) => cols.find((c) => c.id === id)?.name ?? ''

  const chart = useMemo(() => {
    const soft = hexToSoft(color)
    const isPieish = type === 'pie' || type === 'doughnut'
    const commonOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: isPieish },
        title: { display: Boolean(title.trim()), text: title.trim() },
      },
    }

    if (type === 'bar' || type === 'line' || type === 'area') {
      const labels = values(dataset, x).map((v) => (v === null ? '' : String(v)))
      const data = values(dataset, y).map((v) => (v === null ? null : Number(v)))
      const chartData = {
        labels,
        datasets: [
          {
            label: colName(y),
            data,
            backgroundColor: soft,
            borderColor: color,
            borderWidth: 2,
            tension: 0.25,
            fill: type === 'area',
          },
        ],
      }
      return { kind: type === 'bar' ? ('bar' as const) : ('line' as const), data: chartData, options: commonOptions }
    }

    if (isPieish) {
      const xs = values(dataset, x)
      const ys = values(dataset, y)
      const agg = new Map<string, number>()
      for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
        const label = xs[i] === null ? '' : String(xs[i])
        if (label === '') continue
        const v = Number(ys[i])
        if (Number.isFinite(v)) agg.set(label, (agg.get(label) ?? 0) + v)
      }
      if (agg.size === 0) return { kind: 'empty' as const }
      const labels = [...agg.keys()]
      const chartData = {
        labels,
        datasets: [
          {
            label: colName(y),
            data: [...agg.values()],
            backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
            borderWidth: 1,
          },
        ],
      }
      return { kind: type, data: chartData, options: commonOptions }
    }

    if (type === 'scatter') {
      const xs = values(dataset, x)
      const ys = values(dataset, y)
      const points: { x: number; y: number }[] = []
      for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
        const xv = Number(xs[i])
        const yv = Number(ys[i])
        if (Number.isFinite(xv) && Number.isFinite(yv)) points.push({ x: xv, y: yv })
      }
      const chartData = {
        datasets: [{ label: `${colName(x)} vs ${colName(y)}`, data: points, backgroundColor: color }],
      }
      return {
        kind: 'scatter' as const,
        data: chartData,
        options: {
          ...commonOptions,
          scales: {
            x: { type: 'linear' as const, title: { display: true, text: colName(x) } },
            y: { title: { display: true, text: colName(y) } },
          },
        },
      }
    }

    if (type === 'histogram') {
      const nums = cleanNumbers(values(dataset, y))
      if (nums.length === 0) return { kind: 'empty' as const }
      const min = Math.min(...nums)
      const max = Math.max(...nums)
      const k = Math.max(1, Math.min(50, bins))
      const width = (max - min) / k || 1
      const counts = new Array(k).fill(0)
      for (const n of nums) {
        const idx = Math.min(k - 1, Math.floor((n - min) / width))
        counts[idx]++
      }
      const labels = counts.map((_, i) => {
        const lo = min + i * width
        return `${lo.toFixed(1)}–${(lo + width).toFixed(1)}`
      })
      const chartData = {
        labels,
        datasets: [{ label: 'Frequency', data: counts, backgroundColor: soft, borderColor: color, borderWidth: 1 }],
      }
      return {
        kind: 'bar' as const,
        data: chartData,
        options: {
          ...commonOptions,
          scales: { x: { title: { display: true, text: colName(y) } }, y: { title: { display: true, text: 'Count' }, beginAtZero: true } },
        },
      }
    }

    // Box plot: value column `y`, optionally split by group column `x`.
    const groups = new Map<string, number[]>()
    const groupByX = cols.find((c) => c.id === x) && x !== y
    if (groupByX) {
      dataset.rows.forEach((r) => {
        const label = String(r.cells[x] ?? '')
        if (label === '') return
        const v = Number(r.cells[y])
        if (Number.isFinite(v)) {
          if (!groups.has(label)) groups.set(label, [])
          groups.get(label)!.push(v)
        }
      })
    } else {
      groups.set(colName(y) || 'Values', cleanNumbers(values(dataset, y)))
    }
    const labels = [...groups.keys()]
    const chartData = {
      labels,
      datasets: [
        {
          label: colName(y),
          data: [...groups.values()],
          backgroundColor: soft,
          borderColor: color,
          borderWidth: 1.5,
          itemRadius: 2,
        },
      ],
    }
    return { kind: 'box' as const, data: chartData, options: commonOptions }
  }, [type, x, y, bins, title, color, dataset, cols])

  useImperativeHandle(ref, () => ({
    hasChart: () => chart.kind !== 'empty' && Boolean(chartInstanceRef.current),
    suggestedName: () => fileStem(),
    capturePng: capturePngBlob,
    saveToFigures: async () => {
      if (chart.kind === 'empty') throw new Error('No chart to save. Plot data first.')
      const blob = await capturePngBlob()
      if (!blob) throw new Error('No chart to save. Plot data first.')
      await createAsset({
        projectId,
        name: `${fileStem()}.png`,
        mime: 'image/png',
        blob,
      })
      await cloud.saveNow()
      onSavedToFigures?.('Graph saved to Figures.')
    },
  }), [chart.kind, dataset.name, title, type, projectId, cloud, onSavedToFigures])

  const bindRef = (instance: ChartJS | null) => {
    chartInstanceRef.current = instance
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {CHART_TYPES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setType(opt.key)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium',
              type === opt.key
                ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
                : 'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-border)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {(type === 'bar' || type === 'line' || type === 'area' || type === 'scatter' || type === 'box' || type === 'pie' || type === 'doughnut') && (
          <Select
            label={
              type === 'box'
                ? 'Group by (optional)'
                : type === 'scatter'
                  ? 'X'
                  : type === 'pie' || type === 'doughnut'
                    ? 'Category'
                    : 'Category'
            }
            value={x}
            onChange={setXCol}
            columns={type === 'scatter' ? numericCols : cols}
          />
        )}
        <Select
          label={type === 'scatter' ? 'Y' : 'Value'}
          value={y}
          onChange={setYCol}
          columns={numericCols}
        />
        {type === 'histogram' && (
          <label className="flex items-center gap-1.5">
            <span className="text-[var(--color-muted)]">Bins</span>
            <input
              type="number"
              min={1}
              max={50}
              value={bins}
              onChange={(e) => setBins(Number(e.target.value) || 10)}
              className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--color-muted)]">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chart title"
            className="w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
          />
        </label>
        {type !== 'pie' && type !== 'doughnut' && (
          <label className="flex items-center gap-1.5">
            <span className="text-[var(--color-muted)]">Colour</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Series colour"
              className="h-7 w-9 cursor-pointer rounded border border-[var(--color-border)] bg-[var(--color-canvas)]"
            />
          </label>
        )}
      </div>

      <div className="h-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
        {chart.kind === 'empty' ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
            No numeric data to plot.
          </div>
        ) : chart.kind === 'bar' ? (
          <Bar
            ref={bindRef as never}
            data={chart.data as ChartData<'bar'>}
            options={chart.options as ChartOptions<'bar'>}
          />
        ) : chart.kind === 'line' ? (
          <Line
            ref={bindRef as never}
            data={chart.data as ChartData<'line'>}
            options={chart.options as ChartOptions<'line'>}
          />
        ) : chart.kind === 'scatter' ? (
          <Scatter
            ref={bindRef as never}
            data={chart.data as ChartData<'scatter'>}
            options={chart.options as ChartOptions<'scatter'>}
          />
        ) : chart.kind === 'pie' ? (
          <Pie
            ref={bindRef as never}
            data={chart.data as ChartData<'pie'>}
            options={chart.options as ChartOptions<'pie'>}
          />
        ) : chart.kind === 'doughnut' ? (
          <Doughnut
            ref={bindRef as never}
            data={chart.data as ChartData<'doughnut'>}
            options={chart.options as ChartOptions<'doughnut'>}
          />
        ) : (
          <Chart
            ref={bindRef as never}
            type="boxplot"
            data={chart.data as never}
            options={chart.options as never}
          />
        )}
      </div>
    </div>
  )
})

function Select({
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
