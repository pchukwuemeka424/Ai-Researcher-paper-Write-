import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createDataset,
  deleteDataset,
  listDatasets,
  updateDataset,
} from '@/components/research-note/storage/repositories'
import { newId, nowISO } from '@/components/research-note/storage/ids'
import type { Dataset } from '@/components/research-note/storage/types'
import { debounce } from '@/components/research-note/lib/debounce'

/** A blank starter table: a label column + a numeric column, a few empty rows. */
function starterDataset(): Pick<Dataset, 'columns' | 'rows'> {
  const c1 = newId()
  const c2 = newId()
  return {
    columns: [
      { id: c1, name: 'Group', type: 'text' },
      { id: c2, name: 'Value', type: 'number' },
    ],
    rows: Array.from({ length: 5 }, () => ({
      id: newId(),
      cells: { [c1]: null, [c2]: null },
    })),
  }
}

/**
 * A project's datasets. Grid edits update UI state immediately and persist to
 * IndexedDB on a debounced, batched write — so typing feels instant while the
 * change log stays lean.
 */
export function useDatasets(projectId: string) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listDatasets(projectId).then((list) => {
      if (!alive) return
      setDatasets(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [projectId])

  // Debounced batched persistence of in-flight edits.
  const pending = useRef<Map<string, Dataset>>(new Map())
  const flush = useMemo(
    () =>
      debounce(() => {
        for (const [id, d] of pending.current) {
          void updateDataset(id, { name: d.name, columns: d.columns, rows: d.rows })
        }
        pending.current.clear()
      }, 600),
    [],
  )
  useEffect(() => () => flush.flush(), [flush])

  const applyEdit = useCallback(
    (next: Dataset) => {
      const stamped = { ...next, updatedAt: nowISO() }
      setDatasets((prev) => prev.map((d) => (d.id === next.id ? stamped : d)))
      pending.current.set(next.id, stamped)
      flush()
    },
    [flush],
  )

  const create = useCallback(
    async (name: string) => {
      const dataset = await createDataset({ projectId, name, ...starterDataset() })
      setDatasets((prev) => [...prev, dataset])
      return dataset
    },
    [projectId],
  )

  /** Create one dataset per imported sheet; returns the first created id. */
  const importSheets = useCallback(
    async (
      sheets: { name: string; columns: Dataset['columns']; rows: Dataset['rows'] }[],
      fileName: string,
    ) => {
      const created: Dataset[] = []
      for (const sheet of sheets) {
        const dataset = await createDataset({
          projectId,
          name: sheets.length > 1 ? `${fileName} · ${sheet.name}` : fileName,
          columns: sheet.columns,
          rows: sheet.rows,
          sourceFileName: fileName,
          sourceSheetName: sheet.name,
        })
        created.push(dataset)
      }
      setDatasets((prev) => [...prev, ...created])
      return created[0]?.id ?? null
    },
    [projectId],
  )

  const remove = useCallback(
    async (id: string) => {
      pending.current.delete(id)
      await deleteDataset(id)
      setDatasets((prev) => prev.filter((d) => d.id !== id))
    },
    [],
  )

  const flushPending = useCallback(async () => {
    const entries = [...pending.current.entries()]
    pending.current.clear()
    flush.cancel()
    await Promise.all(
      entries.map(([id, d]) =>
        updateDataset(id, { name: d.name, columns: d.columns, rows: d.rows }),
      ),
    )
  }, [flush])

  return { datasets, loading, applyEdit, create, importSheets, remove, flushPending }
}
