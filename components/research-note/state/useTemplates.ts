import { useCallback, useEffect, useState } from 'react'
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
} from '@/components/research-note/storage/repositories'
import type { Template, TemplateKind } from '@/components/research-note/storage/types'
import { importDocxToText } from '@/components/research-note/features/notebook/docxIO'
import { isDocx } from '@/components/research-note/features/notebook/docxIO'

/** A project's upload-to-learn templates. */
export function useTemplates(projectId: string) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    listTemplates(projectId).then((list) => {
      if (!alive) return
      setTemplates(list)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [projectId])

  const addDocx = useCallback(
    async (file: File, kind: TemplateKind) => {
      setError(null)
      if (!isDocx(file)) {
        setError('Please upload a .docx template. (PDF template support comes later.)')
        return
      }
      try {
        const content = await importDocxToText(file)
        const template = await createTemplate({
          projectId,
          name: file.name.replace(/\.docx$/i, ''),
          kind,
          content,
        })
        setTemplates((prev) => [template, ...prev])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file.')
      }
    },
    [projectId],
  )

  const remove = useCallback(async (id: string) => {
    await deleteTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { templates, loading, error, addDocx, remove }
}
