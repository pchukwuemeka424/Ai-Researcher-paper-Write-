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
      case 'table': {
        const cols = Math.max(1, b.headers.length)
        const spec = 'l'.repeat(cols)
        const row = (cells: string[]) =>
          cells.map((c) => escapeLatex(c)).join(' & ') + ' \\\\'
        body.push(
          [
            `\\begin{tabular}{${spec}}`,
            '\\hline',
            row(b.headers),
            '\\hline',
            ...b.rows.map(row),
            '\\hline',
            '\\end{tabular}',
          ].join('\n'),
        )
        break
      }
      case 'image':
        body.push(`% Figure: ${escapeLatex(b.alt)}`)
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
      case 'table': {
        const lines = [
          b.headers.join(' | '),
          ...b.rows.map((r) => r.join(' | ')),
        ]
        for (const line of lines) {
          children.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Consolas', size: 18 })] }))
        }
        break
      }
      case 'image':
        children.push(new Paragraph({ children: [new TextRun(`[Figure: ${b.alt}]`)] }))
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
    const clean = sanitizePdfPlainText(text)
    if (!clean) return
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(15, 23, 42)
    const maxW = Math.max(24, width - indent)
    const lines = doc.splitTextToSize(clean, maxW) as string[]
    const lh = size * 1.35
    for (const line of lines) {
      ensure(lh)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.text(line, margin + indent, y)
      y += lh
    }
  }

  const drawTable = (headers: string[], rows: string[][]) => {
    const cols = Math.max(1, headers.length)
    const colW = width / cols
    const pad = 4
    const fontSize = cols > 5 ? 8 : cols > 3 ? 9 : 10
    const lineH = fontSize * 1.25

    const measureRow = (cells: string[]) => {
      let maxLines = 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fontSize)
      for (let c = 0; c < cols; c++) {
        const text = sanitizePdfPlainText(cells[c] ?? '')
        const wrapped = doc.splitTextToSize(text, colW - pad * 2) as string[]
        maxLines = Math.max(maxLines, wrapped.length)
      }
      return Math.max(lineH + pad * 2, maxLines * lineH + pad * 2)
    }

    const paintRow = (cells: string[], header: boolean) => {
      const rowH = measureRow(cells)
      ensure(rowH + 2)
      doc.setDrawColor(200)
      doc.setFillColor(header ? 241 : 255, header ? 245 : 255, header ? 249 : 255)
      doc.rect(margin, y, width, rowH, 'FD')
      doc.setFont('helvetica', header ? 'bold' : 'normal')
      doc.setFontSize(fontSize)
      doc.setTextColor(15, 23, 42)
      for (let c = 0; c < cols; c++) {
        const text = sanitizePdfPlainText(cells[c] ?? '')
        const wrapped = doc.splitTextToSize(text, colW - pad * 2) as string[]
        let ty = y + pad + fontSize
        for (const line of wrapped) {
          doc.setFont('helvetica', header ? 'bold' : 'normal')
          doc.setFontSize(fontSize)
          doc.text(line, margin + c * colW + pad, ty)
          ty += lineH
        }
        if (c > 0) {
          doc.setDrawColor(220)
          doc.line(margin + c * colW, y, margin + c * colW, y + rowH)
        }
      }
      y += rowH
    }

    y += 4
    paintRow(headers, true)
    for (const row of rows) paintRow(row, false)
    y += 8
  }

  const drawImage = async (alt: string, src: string) => {
    if (!src.startsWith('data:image/') && !/^https?:\/\//i.test(src)) {
      writeLines(`[Image: ${alt}]`, 10, false)
      y += 4
      return
    }
    try {
      const prepared = await prepareImageForPdf(src)
      const maxW = width
      const maxH = Math.min(pageH - margin * 2 - 40, 320)
      let drawW = prepared.width
      let drawH = prepared.height
      const scale = Math.min(maxW / drawW, maxH / drawH, 1)
      drawW *= scale
      drawH *= scale
      ensure(drawH + 28)
      if (alt.trim()) {
        writeLines(alt, 10, true)
        y += 2
      }
      ensure(drawH + 4)
      doc.addImage(prepared.data, prepared.format, margin, y, drawW, drawH)
      y += drawH + 10
    } catch {
      writeLines(`[Image could not be embedded: ${alt}]`, 10, false)
      y += 4
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
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        for (const line of b.text.split('\n')) {
          const wrapped = doc.splitTextToSize(sanitizePdfPlainText(line), width) as string[]
          for (const w of wrapped) {
            ensure(12)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
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
      case 'table':
        drawTable(b.headers, b.rows)
        break
      case 'image':
        await drawImage(b.alt, b.src)
        break
    }
  }
  download(doc.output('blob'), `${base}.pdf`)
}

/** Keep PDF body text in one Helvetica-safe ASCII stream so wrapping stays stable. */
function sanitizePdfPlainText(raw: string): string {
  return raw
    .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

async function prepareImageForPdf(
  src: string,
): Promise<{ data: string; format: 'JPEG' | 'PNG'; width: number; height: number }> {
  if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
    const dims = await loadImageDims(src)
    return { data: src, format: 'JPEG', ...dims }
  }
  if (src.startsWith('data:image/png')) {
    const dims = await loadImageDims(src)
    return { data: src, format: 'PNG', ...dims }
  }

  const image = await loadHtmlImage(src)
  const canvas = document.createElement('canvas')
  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return {
    data: canvas.toDataURL('image/jpeg', 0.88),
    format: 'JPEG',
    width: canvas.width,
    height: canvas.height,
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image'))
    image.src = src
  })
}

async function loadImageDims(src: string): Promise<{ width: number; height: number }> {
  const image = await loadHtmlImage(src)
  return { width: image.width || 1, height: image.height || 1 }
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
    else if (b.type === 'table') {
      current.lines.push(b.headers.join(' | '))
      for (const row of b.rows) current.lines.push(row.join(' | '))
    } else if (b.type === 'image') {
      current.lines.push(`[Figure: ${b.alt}]`)
    }
  }
  return groups
}
