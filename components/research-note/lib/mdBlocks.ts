/**
 * Lightweight Markdown → block model, shared by the exporters (docx / pdf /
 * pptx / latex). Produces a flat list of structural blocks with plain-text
 * content (inline emphasis stripped) — enough for faithful, non-corrupt export
 * of the AI drafts without a heavy Markdown-AST dependency.
 */
export type MdBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; alt: string; src: string }

/** Strip inline Markdown markers to readable plain text. */
export function stripInline(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
    .trim()
}

function splitTableRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|')) row = row.slice(0, -1)
  return row.split('|').map((c) => stripInline(c.trim()))
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line)
  if (cells.length === 0) return false
  return cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')))
}

function isTableRow(line: string): boolean {
  const t = line.trim()
  if (!t.includes('|')) return false
  // Require at least one pipe that isn't just a lone character edge case
  return /\|/.test(t) && !/^\s*(-{3,}|\*{3,})\s*$/.test(t)
}

export function parseMarkdown(md: string): MdBlock[] {
  const lines = md.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  const flushList = (ordered: boolean, items: string[]) => {
    if (items.length) blocks.push({ type: 'list', ordered, items })
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code
    if (line.trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    if (/^\s*$/.test(line)) {
      i++
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: stripInline(heading[2]) })
      i++
      continue
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      blocks.push({ type: 'quote', text: stripInline(line.replace(/^\s*>\s?/, '')) })
      i++
      continue
    }

    // Image on its own line: ![alt](src)
    const imageOnly = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line)
    if (imageOnly) {
      blocks.push({ type: 'image', alt: imageOnly[1] || 'Figure', src: imageOnly[2].trim() })
      i++
      continue
    }

    // GFM table: header + divider + body rows
    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableDivider(lines[i + 1])
    ) {
      const headers = splitTableRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i]) && !isTableDivider(lines[i])) {
        const cells = splitTableRow(lines[i])
        // Pad / trim to header width
        const padded = headers.map((_, idx) => cells[idx] ?? '')
        rows.push(padded)
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    // Lists (consume consecutive items)
    const isUl = (l: string) => /^\s*[-*]\s+/.test(l)
    const isOl = (l: string) => /^\s*\d+\.\s+/.test(l)
    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line)
      const items: string[] = []
      while (i < lines.length && (ordered ? isOl(lines[i]) : isUl(lines[i]))) {
        const raw = lines[i]
        const imgOnly = /^\s*(?:[-*]|\d+\.)\s+!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(raw)
        if (imgOnly) {
          if (items.length) {
            flushList(ordered, items)
            items.length = 0
          }
          blocks.push({ type: 'image', alt: imgOnly[1] || 'Figure', src: imgOnly[2].trim() })
          i++
          continue
        }
        items.push(stripInline(raw.replace(/^\s*(?:[-*]|\d+\.)\s+/, '')))
        i++
      }
      flushList(ordered, items)
      continue
    }

    // Paragraph that may contain an inline image — keep text, emit image after if alone-ish
    const inlineImg = /!\[([^\]]*)\]\(([^)]+)\)/.exec(line)
    if (inlineImg && line.trim() === inlineImg[0]) {
      blocks.push({ type: 'image', alt: inlineImg[1] || 'Figure', src: inlineImg[2].trim() })
      i++
      continue
    }

    blocks.push({ type: 'paragraph', text: stripInline(line) })
    i++
  }

  return blocks
}
