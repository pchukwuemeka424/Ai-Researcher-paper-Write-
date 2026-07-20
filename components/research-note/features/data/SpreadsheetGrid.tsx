import { useEffect, useState } from 'react'
import { InlineText } from '@/components/research-note/components/InlineText'
import { PlusIcon, TrashIcon } from '@/components/research-note/components/icons'
import { newId } from '@/components/research-note/storage/ids'
import type { CellValue, Dataset } from '@/components/research-note/storage/types'

const PAGE_SIZE = 10

/**
 * Custom lightweight editable grid — no grid dependency (the "light & fast"
 * choice). Supports cell editing, add/remove rows & columns, column rename &
 * type toggle, and pasting a tab/newline-separated block from Excel/Sheets.
 *
 * Cell values are stored as typed strings (or null); numeric coercion happens
 * at analysis time, which keeps typing responsive.
 */
export function SpreadsheetGrid({
  dataset,
  onChange,
}: {
  dataset: Dataset
  onChange: (next: Dataset) => void
}) {
  const [page, setPage] = useState(0)
  const totalRows = dataset.rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE) || 1)
  const safePage = Math.min(page, totalPages - 1)
  const pageStart = safePage * PAGE_SIZE
  const pageRows = dataset.rows.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [dataset.id])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const setCell = (rowId: string, colId: string, value: CellValue) => {
    onChange({
      ...dataset,
      rows: dataset.rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r,
      ),
    })
  }

  const renameColumn = (colId: string, name: string) =>
    onChange({
      ...dataset,
      columns: dataset.columns.map((c) => (c.id === colId ? { ...c, name } : c)),
    })

  const toggleType = (colId: string) =>
    onChange({
      ...dataset,
      columns: dataset.columns.map((c) =>
        c.id === colId
          ? { ...c, type: c.type === 'number' ? 'text' : 'number' }
          : c,
      ),
    })

  const addColumn = () => {
    const id = newId()
    onChange({
      ...dataset,
      columns: [
        ...dataset.columns,
        { id, name: `Column ${dataset.columns.length + 1}`, type: 'number' },
      ],
      rows: dataset.rows.map((r) => ({ ...r, cells: { ...r.cells, [id]: null } })),
    })
  }

  const deleteColumn = (colId: string) =>
    onChange({
      ...dataset,
      columns: dataset.columns.filter((c) => c.id !== colId),
      rows: dataset.rows.map((r) => {
        const { [colId]: _drop, ...rest } = r.cells
        return { ...r, cells: rest }
      }),
    })

  const addRow = () => {
    onChange({
      ...dataset,
      rows: [
        ...dataset.rows,
        {
          id: newId(),
          cells: Object.fromEntries(dataset.columns.map((c) => [c.id, null])),
        },
      ],
    })
    setPage(Math.floor(totalRows / PAGE_SIZE))
  }

  const deleteRow = (rowId: string) =>
    onChange({ ...dataset, rows: dataset.rows.filter((r) => r.id !== rowId) })

  /** Paste a tab/newline block starting at absolute (rowIndex, colIndex), growing rows as needed. */
  const pasteBlock = (rowIndex: number, colIndex: number, text: string) => {
    const matrix = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, i, arr) => !(i === arr.length - 1 && line === ''))
      .map((line) => line.split('\t'))
    if (matrix.length === 0) return

    const rows = dataset.rows.map((r) => ({ ...r, cells: { ...r.cells } }))
    // Grow rows to fit.
    while (rows.length < rowIndex + matrix.length) {
      rows.push({
        id: newId(),
        cells: Object.fromEntries(dataset.columns.map((c) => [c.id, null])),
      })
    }
    matrix.forEach((cols, dr) => {
      cols.forEach((val, dc) => {
        const col = dataset.columns[colIndex + dc]
        const row = rows[rowIndex + dr]
        if (col && row) row.cells[col.id] = val === '' ? null : val
      })
    })
    onChange({ ...dataset, rows })
  }

  const isBadNumber = (col: { type: string }, v: CellValue) =>
    col.type === 'number' && v !== null && v !== '' && !Number.isFinite(Number(v))

  const rangeLabel =
    totalRows === 0
      ? '0 rows'
      : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, totalRows)} of ${totalRows}`

  return (
    <div className="overflow-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--color-surface)]">
            <th className="w-10 border-b border-r border-[var(--color-border)] px-2 py-1.5 text-xs font-normal text-[var(--color-muted)]">
              #
            </th>
            {dataset.columns.map((col) => (
              <th
                key={col.id}
                className="group min-w-32 border-b border-r border-[var(--color-border)] px-2 py-1.5 text-left"
              >
                <div className="flex items-center gap-1">
                  <InlineText
                    value={col.name}
                    onCommit={(t) => renameColumn(col.id, t)}
                    ariaLabel="Column name"
                    className="flex-1 cursor-text font-semibold"
                  />
                  <button
                    type="button"
                    title={`Type: ${col.type} (click to toggle)`}
                    aria-label={`Toggle type for ${col.name}`}
                    onClick={() => toggleType(col.id)}
                    className="rounded bg-[var(--color-canvas)] px-1 text-[10px] font-mono text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    {col.type === 'number' ? '123' : 'abc'}
                  </button>
                  <button
                    type="button"
                    title="Delete column"
                    aria-label={`Delete column ${col.name}`}
                    onClick={() => deleteColumn(col.id)}
                    className="rounded p-0.5 text-[var(--color-muted)] opacity-0 hover:text-red-600 group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </th>
            ))}
            <th className="border-b border-[var(--color-border)] px-1">
              <button
                type="button"
                title="Add column"
                aria-label="Add column"
                onClick={addColumn}
                className="rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-brand)]"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, localIndex) => {
            const rowIndex = pageStart + localIndex
            return (
              <tr key={row.id} className="group/row">
                <td className="border-b border-r border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-center text-xs text-[var(--color-muted)]">
                  {rowIndex + 1}
                </td>
                {dataset.columns.map((col, colIndex) => {
                  const value = row.cells[col.id] ?? null
                  return (
                    <td
                      key={col.id}
                      className="border-b border-r border-[var(--color-border)] p-0"
                    >
                      <input
                        value={value === null ? '' : String(value)}
                        onChange={(e) =>
                          setCell(
                            row.id,
                            col.id,
                            e.target.value === '' ? null : e.target.value,
                          )
                        }
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text')
                          if (/[\t\n]/.test(text)) {
                            e.preventDefault()
                            pasteBlock(rowIndex, colIndex, text)
                          }
                        }}
                        inputMode={col.type === 'number' ? 'decimal' : 'text'}
                        className={[
                          'w-full bg-transparent px-2 py-1 outline-none focus:bg-[var(--color-brand)]/5',
                          col.type === 'number' ? 'text-right tabular-nums' : '',
                          isBadNumber(col, value) ? 'text-red-600' : '',
                        ].join(' ')}
                        aria-label={`${col.name} row ${rowIndex + 1}`}
                      />
                    </td>
                  )
                })}
                <td className="border-b border-[var(--color-border)] px-1 text-center">
                  <button
                    type="button"
                    title="Delete row"
                    aria-label={`Delete row ${rowIndex + 1}`}
                    onClick={() => deleteRow(row.id)}
                    className="rounded p-0.5 text-[var(--color-muted)] opacity-0 hover:text-red-600 group-hover/row:opacity-100"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] px-3 py-1.5">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)]"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add row
        </button>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span>{rangeLabel}</span>
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-[var(--color-border)] px-2 py-0.5 hover:bg-[var(--color-surface)] disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-[var(--color-border)] px-2 py-0.5 hover:bg-[var(--color-surface)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
