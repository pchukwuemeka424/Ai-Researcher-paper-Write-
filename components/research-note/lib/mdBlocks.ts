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

/** Strip inline Markdown markers to readable plain text. */
export function stripInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
    .trim()
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

    // Lists (consume consecutive items)
    const isUl = (l: string) => /^\s*[-*]\s+/.test(l)
    const isOl = (l: string) => /^\s*\d+\.\s+/.test(l)
    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line)
      const items: string[] = []
      while (i < lines.length && (ordered ? isOl(lines[i]) : isUl(lines[i]))) {
        items.push(stripInline(lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, '')))
        i++
      }
      flushList(ordered, items)
      continue
    }

    blocks.push({ type: 'paragraph', text: stripInline(line) })
    i++
  }

  return blocks
}
