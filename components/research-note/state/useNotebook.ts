import { useCallback, useEffect, useState } from 'react'
import {
  createPage,
  createSection,
  deletePage,
  deleteSection,
  getProject,
  listPages,
  listSections,
  updatePage,
  updateSection,
} from '@/components/research-note/storage/repositories'
import type { Page, Project, RichTextDoc, Section } from '@/components/research-note/storage/types'

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position

/**
 * State for a single project's notebook: its sections, pages, the active page,
 * and all mutations including debounce-friendly content autosave.
 *
 * Mount this hook keyed by projectId (NotebookView is keyed) so switching
 * projects resets its state cleanly.
 */
export function useNotebook(projectId: string) {
  const [project, setProject] = useState<Project | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial load.
  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      const [p, s, pg] = await Promise.all([
        getProject(projectId),
        listSections(projectId),
        listPages(projectId),
      ])
      if (!alive) return
      setProject(p ?? null)
      setSections(s)
      setPages(pg)
      setActivePageId(pg[0]?.id ?? null)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [projectId])

  // Keep the active selection valid after any deletion.
  useEffect(() => {
    if (activePageId && !pages.some((p) => p.id === activePageId)) {
      setActivePageId(pages[0]?.id ?? null)
    }
  }, [pages, activePageId])

  const addSection = useCallback(
    async (title = 'New section') => {
      const section = await createSection({ projectId, title })
      setSections((prev) => [...prev, section].sort(byPosition))
      return section
    },
    [projectId],
  )

  const renameSection = useCallback(async (id: string, title: string) => {
    const updated = await updateSection(id, { title })
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }, [])

  const removeSection = useCallback(async (id: string) => {
    await deleteSection(id)
    setSections((prev) => prev.filter((s) => s.id !== id))
    setPages((prev) => prev.filter((p) => p.sectionId !== id))
  }, [])

  const addPage = useCallback(
    async (sectionId: string, title = 'Untitled page') => {
      const page = await createPage({ sectionId, projectId, title })
      setPages((prev) => [...prev, page].sort(byPosition))
      setActivePageId(page.id)
      return page
    },
    [projectId],
  )

  const renamePage = useCallback(async (id: string, title: string) => {
    const updated = await updatePage(id, { title })
    setPages((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }, [])

  const removePage = useCallback(async (id: string) => {
    await deletePage(id)
    setPages((prev) => prev.filter((p) => p.id !== id))
  }, [])

  /** Persist edited content. Editor is keyed by pageId, so this won't remount it. */
  const savePageContent = useCallback(
    async (id: string, content: RichTextDoc | null) => {
      const updated = await updatePage(id, { content })
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)))
    },
    [],
  )

  const activePage = pages.find((p) => p.id === activePageId) ?? null

  return {
    project,
    sections,
    pages,
    activePage,
    activePageId,
    loading,
    setActivePageId,
    addSection,
    renameSection,
    removeSection,
    addPage,
    renamePage,
    removePage,
    savePageContent,
  }
}
