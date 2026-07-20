import { newId } from '@/components/research-note/storage/ids'
import type { CellValue, Dataset, DatasetColumn, DatasetRow } from '@/components/research-note/storage/types'

/**
 * Spreadsheet import/export via SheetJS. The `xlsx` library is loaded with a
 * dynamic import() so it only downloads when a user actually opens or exports a
 * file (keeps the Data chunk light). Cross-platform, fully client-side.
 */

export interface ParsedSheet {
  name: string
  columns: DatasetColumn[]
  rows: DatasetRow[]
}

/** Read a .xlsx/.xls/.csv/.tsv file into one ParsedSheet per worksheet. */
export async function importSpreadsheet(file: File): Promise<ParsedSheet[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })
    return aoaToSheet(sheetName, aoa)
  })
}

/** Convert an array-of-arrays (first row = header) into our dataset shape. */
function aoaToSheet(name: string, aoa: unknown[][]): ParsedSheet {
  const headerRow = aoa[0] ?? []
  const dataRows = aoa.slice(1)
  const maxDataLen = dataRows.reduce((m, r) => Math.max(m, r.length), 0)
  const colCount = Math.max(headerRow.length, maxDataLen)

  const columns: DatasetColumn[] = []
  for (let c = 0; c < colCount; c++) {
    const raw = headerRow[c]
    const colName = raw === null || raw === undefined || raw === '' ? `Column ${c + 1}` : String(raw)
    columns.push({ id: newId(), name: colName, type: 'text' })
  }

  const rows: DatasetRow[] = dataRows.map((r) => {
    const cells: Record<string, CellValue> = {}
    columns.forEach((col, c) => {
      const v = r[c]
      cells[col.id] =
        v === undefined || v === null || v === ''
          ? null
          : typeof v === 'number'
            ? v
            : String(v)
    })
    return { id: newId(), cells }
  })

  // Infer numeric columns from the data.
  columns.forEach((col) => {
    const vals = rows.map((r) => r.cells[col.id]).filter((v) => v !== null)
    const numeric =
      vals.length > 0 &&
      vals.every((v) => typeof v === 'number' || Number.isFinite(Number(v)))
    if (numeric) col.type = 'number'
  })

  return { name, columns, rows }
}

/** Write a dataset back out as .xlsx or .csv and trigger a download. */
export async function exportDataset(
  dataset: Dataset,
  format: 'xlsx' | 'csv',
): Promise<void> {
  const XLSX = await import('xlsx')
  const header = dataset.columns.map((c) => c.name)
  const body = dataset.rows.map((row) =>
    dataset.columns.map((col) => {
      const v = row.cells[col.id]
      if (v === null || v === undefined) return null
      if (col.type === 'number') {
        const n = Number(v)
        return Number.isFinite(n) ? n : v
      }
      return v
    }),
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...body])
  const wb = XLSX.utils.book_new()
  const sheetName = (dataset.sourceSheetName || dataset.name || 'Sheet1').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const base = dataset.sourceFileName?.replace(/\.[^.]+$/, '') || dataset.name || 'dataset'
  XLSX.writeFile(wb, `${base}.${format}`, { bookType: format })
}
