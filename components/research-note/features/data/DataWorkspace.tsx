import { useEffect, useRef, useState } from 'react'
import { useDatasets } from '@/components/research-note/state/useDatasets'
import { InlineText } from '@/components/research-note/components/InlineText'
import { PlusIcon, TrashIcon } from '@/components/research-note/components/icons'
import { WorkspaceSaveButton, useCloudSave } from '@/components/research-note/features/sync/CloudSave'
import { createAsset } from '@/components/research-note/storage/repositories'
import { SpreadsheetGrid } from './SpreadsheetGrid'
import { StatsPanel, type StatsPanelHandle } from './StatsPanel'
import { ChartPanel, type ChartPanelHandle } from './ChartPanel'
import { exportDataset, importSpreadsheet } from './xlsxIO'

/** The Data tab: open real spreadsheets, edit, run statistics, and plot. */
export function DataWorkspace({ projectId }: { projectId: string }) {
  const { datasets, loading, applyEdit, create, importSheets, remove, flushPending } =
    useDatasets(projectId)
  const cloud = useCloudSave()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tool, setTool] = useState<'stats' | 'charts'>('stats')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [savingFigures, setSavingFigures] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const chartRef = useRef<ChartPanelHandle>(null)
  const statsRef = useRef<StatsPanelHandle>(null)

  useEffect(() => {
    if (activeId && !datasets.some((d) => d.id === activeId)) {
      setActiveId(datasets[0]?.id ?? null)
    } else if (!activeId && datasets.length > 0) {
      setActiveId(datasets[0].id)
    }
  }, [datasets, activeId])

  const active = datasets.find((d) => d.id === activeId) ?? null

  const onOpenFile = () => fileRef.current?.click()

  const persistCloud = async (message?: string) => {
    flushPending()
    await cloud.saveNow()
    if (message) {
      setSavedHint(message)
      window.setTimeout(() => setSavedHint(null), 2500)
    }
  }

  /** Flush dataset edits and, when Charts is open, store the graph as a Figure. */
  const saveWorkspace = async () => {
    setError(null)
    flushPending()
    let graphSaved = false
    if (tool === 'charts' && chartRef.current?.hasChart()) {
      const blob = await chartRef.current.capturePng()
      if (blob) {
        const name = `${chartRef.current.suggestedName()}.png`
        await createAsset({
          projectId,
          name,
          mime: 'image/png',
          blob,
        })
        graphSaved = true
      }
    }
    setSavedHint(
      graphSaved
        ? 'Dataset and graph saved to Figures.'
        : 'Dataset saved.',
    )
    window.setTimeout(() => setSavedHint(null), 2500)
  }

  const onSavedToFigures = (message: string) => {
    setSavedHint(message)
    window.setTimeout(() => setSavedHint(null), 2500)
  }

  const saveActiveToFigures = async () => {
    setError(null)
    setSavingFigures(true)
    try {
      if (tool === 'stats') await statsRef.current?.saveToFigures()
      else await chartRef.current?.saveToFigures()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save to Figures.')
    } finally {
      setSavingFigures(false)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setImporting(true)
    try {
      const sheets = await importSpreadsheet(file)
      if (sheets.length === 0) throw new Error('No sheets found in that file.')
      const firstId = await importSheets(sheets, file.name)
      if (firstId) setActiveId(firstId)
      await persistCloud(
        sheets.length === 1
          ? 'Dataset uploaded and saved.'
          : `${sheets.length} sheets uploaded and saved.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-muted)]">
        Loading data…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={onFile}
      />

      {/* Toolbar: import is the primary action */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-2">
        <div className="mr-2 hidden min-w-0 max-w-xs sm:block">
          <p className="text-[0.7rem] font-semibold text-[var(--color-ink)]">Datasets</p>
          <p className="text-[0.65rem] leading-snug text-[var(--color-muted)]">
            Import a spreadsheet, then use Stats or Charts. Save charts to Figures for your manuscript.
          </p>
        </div>
        {datasets.map((d) => (
          <div
            key={d.id}
            className={[
              'group flex items-center gap-1 rounded-md px-2 py-1 text-sm',
              d.id === activeId
                ? 'bg-[var(--color-brand)]/10 text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]',
            ].join(' ')}
          >
            <button type="button" onClick={() => setActiveId(d.id)}>
              <InlineText
                value={d.name}
                onCommit={(name) => applyEdit({ ...d, name })}
                ariaLabel="Dataset name"
                className="cursor-pointer"
              />
            </button>
            <button
              type="button"
              title="Delete dataset"
              aria-label={`Delete dataset ${d.name}`}
              onClick={() => {
                if (window.confirm(`Delete dataset "${d.name}"?`)) void remove(d.id)
              }}
              className="rounded p-0.5 text-[var(--color-muted)] opacity-0 hover:text-red-600 group-hover:opacity-100"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <WorkspaceSaveButton
            label={tool === 'charts' ? 'Save dataset & graph' : 'Save dataset'}
            onBeforeSave={saveWorkspace}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onOpenFile}
            disabled={importing}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            {importing ? 'Uploading…' : 'Upload dataset'}
          </button>
          <button
            type="button"
            onClick={() =>
              void create(`Dataset ${datasets.length + 1}`).then(() =>
                persistCloud('Blank dataset saved.'),
              )
            }
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Blank
          </button>
        </div>
      </div>

      {(error || savedHint) && (
        <p
          className={[
            'border-b px-4 py-2 text-sm',
            error
              ? 'border-[var(--color-border)] bg-red-50 text-red-600'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]',
          ].join(' ')}
        >
          {error || savedHint}
        </p>
      )}

      {active ? (
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-muted)]">
              {active.rows.length} rows × {active.columns.length} columns
              {active.sourceFileName && (
                <span className="ml-2 rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">
                  from {active.sourceFileName}
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Export</span>
              <button
                type="button"
                onClick={() => void exportDataset(active, 'xlsx')}
                className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)]"
              >
                .xlsx
              </button>
              <button
                type="button"
                onClick={() => void exportDataset(active, 'csv')}
                className="rounded-md border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface)]"
              >
                .csv
              </button>
            </div>
          </div>

          <SpreadsheetGrid dataset={active} onChange={applyEdit} />

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <ToolTab label="Statistics" active={tool === 'stats'} onClick={() => setTool('stats')} />
              <ToolTab label="Charts" active={tool === 'charts'} onClick={() => setTool('charts')} />
              <button
                type="button"
                disabled={savingFigures || cloud.saving}
                onClick={() => void saveActiveToFigures()}
                className="ml-auto rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
              >
                {savingFigures || cloud.saving ? 'Saving to Figures…' : 'Save to Figures'}
              </button>
            </div>
            {tool === 'stats' ? (
              <StatsPanel
                ref={statsRef}
                dataset={active}
                projectId={projectId}
                onSavedToFigures={onSavedToFigures}
              />
            ) : (
              <ChartPanel
                ref={chartRef}
                dataset={active}
                projectId={projectId}
                onSavedToFigures={onSavedToFigures}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Upload a dataset</h2>
          <p className="mt-1 max-w-md text-sm text-[var(--color-muted)]">
            Import a real <strong>.xlsx</strong>, <strong>.xls</strong>,{' '}
            <strong>.csv</strong> or <strong>.tsv</strong> file to read, edit,
            analyse, and plot it — then export it back out. Or start from a blank
            table.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenFile}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
            >
              {importing ? 'Uploading…' : 'Upload dataset'}
            </button>
            <button
              type="button"
              onClick={() => void create('Dataset 1')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface)]"
            >
              <PlusIcon /> Blank dataset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md px-3 py-1.5 text-sm font-medium',
        active
          ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
          : 'bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-border)]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
