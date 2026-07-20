import { parseMarkdown, type MdBlock } from '@/components/research-note/lib/mdBlocks'

/**
 * Export an AI draft (Markdown) to Markdown, LaTeX, Word, PDF, or PowerPoint.
 * The heavy libraries (docx, jspdf, pptxgenjs) are dynamically imported so they
 * only download when the user actually exports that format — nothing lands in
 * the eager bundle.
 */

export type ExportFormat = 'md' | 'tex' | 'docx' | 'pdf' | 'pptx'

export const EXPORT_LABELS: Record<ExportFormat, string> = {
  md: 'Markdown (.md)',
  tex: 'LaTeX (.tex)',
  docx: 'Word (.docx)',
  pdf: 'PDF (.pdf)',
  pptx: 'PowerPoint (.pptx)',
}

function sanitize(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'document'
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportDraft(
  format: ExportFormat,
  name: string,
  markdown: string,
): Promise<void> {
  const base = sanitize(name)
  switch (format) {
    case 'md':
      return download(new Blob([markdown], { type: 'text/markdown' }), `${base}.md`)
    case 'tex':
      return download(new Blob([toLatex(markdown)], { type: 'text/x-tex' }), `${base}.tex`)
    case 'docx':
      return exportDocx(base, markdown)
    case 'pdf':
      return exportPdf(base, markdown)
    case 'pptx':
      return exportPptx(base, markdown)
  }
}

// ─────────────────────────────── LaTeX ────────────────────────────────

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

function toLatex(markdown: string): string {
  const blocks = parseMarkdown(markdown)
  const body: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading': {
        const cmd = ['section', 'section', 'subsection', 'subsubsection', 'paragraph', 'paragraph'][
          Math.min(5, b.level)
        ]
        body.push(`\\${cmd}{${escapeLatex(b.text)}}`)
        break
      }
      case 'paragraph':
        body.push(escapeLatex(b.text))
        break
      case 'quote':
        body.push(`\\begin{quote}\n${escapeLatex(b.text)}\n\\end{quote}`)
        break
      case 'code':
        body.push(`\\begin{verbatim}\n${b.text}\n\\end{verbatim}`)
        break
      case 'list': {
        const env = b.ordered ? 'enumerate' : 'itemize'
        body.push(
          `\\begin{${env}}\n${b.items.map((it) => `  \\item ${escapeLatex(it)}`).join('\n')}\n\\end{${env}}`,
        )
        break
      }
      case 'hr':
        body.push('\\hrulefill')
        break
    }
  }
  return [
    '\\documentclass{article}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage{hyperref}',
    '\\begin{document}',
    '',
    body.join('\n\n'),
    '',
    '\\end{document}',
  ].join('\n')
}

// ──────────────────────────────── Word ────────────────────────────────

async function exportDocx(base: string, markdown: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    await import('docx')
  const blocks = parseMarkdown(markdown)
  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
  ]
  const children: InstanceType<typeof Paragraph>[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        children.push(
          new Paragraph({ heading: HEADINGS[Math.min(4, b.level - 1)], children: [new TextRun(b.text)] }),
        )
        break
      case 'paragraph':
        children.push(new Paragraph({ children: [new TextRun(b.text)] }))
        break
      case 'quote':
        children.push(new Paragraph({ children: [new TextRun({ text: b.text, italics: true })], indent: { left: 480 } }))
        break
      case 'code':
        for (const line of b.text.split('\n')) {
          children.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas', size: 20 })] }))
        }
        break
      case 'list':
        for (const item of b.items) {
          children.push(
            new Paragraph({
              children: [new TextRun(item)],
              ...(b.ordered
                ? { numbering: { reference: 'rp-num', level: 0 } }
                : { bullet: { level: 0 } }),
            }),
          )
        }
        break
      case 'hr':
        children.push(
          new Paragraph({
            children: [],
            border: { bottom: { color: 'CCCCCC', size: 6, style: BorderStyle.SINGLE, space: 1 } },
          }),
        )
        break
    }
  }
  if (children.length === 0) children.push(new Paragraph({ children: [] }))

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'rp-num',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children }],
  })
  download(await Packer.toBlob(doc), `${base}.docx`)
}

// ──────────────────────────────── PDF ─────────────────────────────────

async function exportPdf(base: string, markdown: string): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 56
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const width = pageW - margin * 2
  let y = margin

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }
  const writeLines = (text: string, size: number, bold: boolean, indent = 0) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, width - indent) as string[]
    const lh = size * 1.35
    for (const line of lines) {
      ensure(lh)
      doc.text(line, margin + indent, y)
      y += lh
    }
  }

  for (const b of parseMarkdown(markdown)) {
    switch (b.type) {
      case 'heading':
        y += 6
        writeLines(b.text, Math.max(11, 20 - (b.level - 1) * 2), true)
        y += 2
        break
      case 'paragraph':
        writeLines(b.text, 11, false)
        y += 4
        break
      case 'quote':
        writeLines(b.text, 11, false, 16)
        y += 4
        break
      case 'code':
        doc.setFont('courier', 'normal')
        for (const line of b.text.split('\n')) {
          doc.setFontSize(9)
          const wrapped = doc.splitTextToSize(line, width) as string[]
          for (const w of wrapped) {
            ensure(12)
            doc.text(w, margin, y)
            y += 12
          }
        }
        y += 4
        break
      case 'list':
        b.items.forEach((item, idx) => {
          const prefix = b.ordered ? `${idx + 1}. ` : '• '
          writeLines(prefix + item, 11, false, 14)
        })
        y += 4
        break
      case 'hr':
        ensure(12)
        doc.setDrawColor(200)
        doc.line(margin, y, pageW - margin, y)
        y += 10
        break
    }
  }
  download(doc.output('blob'), `${base}.pdf`)
}

// ─────────────────────────────── PowerPoint ───────────────────────────

async function exportPptx(base: string, markdown: string): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  const blocks = parseMarkdown(markdown)

  // Title slide from the first top-level heading, else the file name.
  const titleBlock = blocks.find((b) => b.type === 'heading' && b.level <= 2)
  const title = titleBlock && titleBlock.type === 'heading' ? titleBlock.text : base
  const cover = pptx.addSlide()
  cover.addText(title, { x: 0.5, y: 2.2, w: 12.3, h: 1.5, fontSize: 34, bold: true, align: 'center' })

  // Group content into slides at each level ≤2 heading.
  const groups = groupIntoSlides(blocks)
  for (const g of groups) {
    const slide = pptx.addSlide()
    slide.addText(g.title, { x: 0.5, y: 0.4, w: 12.3, h: 0.9, fontSize: 24, bold: true })
    const bullets = g.lines.map((line) => ({ text: line, options: { bullet: true, fontSize: 16 } }))
    if (bullets.length) {
      slide.addText(bullets, { x: 0.7, y: 1.5, w: 11.9, h: 5.5, valign: 'top' })
    }
  }

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob
  download(blob, `${base}.pptx`)
}

function groupIntoSlides(blocks: MdBlock[]): { title: string; lines: string[] }[] {
  const groups: { title: string; lines: string[] }[] = []
  let current: { title: string; lines: string[] } | null = null
  for (const b of blocks) {
    if (b.type === 'heading' && b.level <= 2) {
      current = { title: b.text, lines: [] }
      groups.push(current)
      continue
    }
    if (!current) {
      current = { title: 'Overview', lines: [] }
      groups.push(current)
    }
    if (b.type === 'heading') current.lines.push(b.text)
    else if (b.type === 'paragraph' || b.type === 'quote') current.lines.push(b.text)
    else if (b.type === 'list') current.lines.push(...b.items)
  }
  return groups
}
