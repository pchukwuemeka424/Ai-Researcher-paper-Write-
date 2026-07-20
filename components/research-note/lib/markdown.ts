/**
 * Minimal, safe Markdown → HTML renderer for draft previews. HTML is escaped
 * first, so the output is safe to inject. Covers the subset the AI produces:
 * headings, bold/italic, inline code, fenced code, blockquotes, lists, rules,
 * links, and paragraphs. No dependency — keeps the bundle light.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\b_([^_]+)_\b/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
}

export function markdownToHtml(md: string): string {
  const lines = escapeHtml(md).split('\n')
  const out: string[] = []
  let inCode = false
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push('</code></pre>')
        inCode = false
      } else {
        closeList()
        out.push('<pre><code>')
        inCode = true
      }
      continue
    }
    if (inCode) {
      out.push(line + '\n')
      continue
    }

    if (/^\s*$/.test(line)) {
      closeList()
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      closeList()
      out.push('<hr>')
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      closeList()
      out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`)
      continue
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (ul || ol) {
      const type = ul ? 'ul' : 'ol'
      if (listType !== type) {
        closeList()
        out.push(`<${type}>`)
        listType = type
      }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`)
      continue
    }

    closeList()
    out.push(`<p>${inline(line)}</p>`)
  }

  if (inCode) out.push('</code></pre>')
  closeList()
  return out.join('\n')
}

/** True when content is already HTML (e.g. from the Word-style draft editor). */
export function looksLikeHtml(content: string): boolean {
  const t = content.trim()
  return t.startsWith('<') && /<\/?[a-z][\s\S]*>/i.test(t)
}

/** Load draft content into the rich editor (markdown from AI → HTML). */
export function draftContentToHtml(content: string): string {
  if (!content.trim()) return '<p></p>'
  if (looksLikeHtml(content)) return content
  return markdownToHtml(content)
}

/**
 * Rough HTML → Markdown for exports that still expect Markdown.
 * Handles the subset TipTap StarterKit produces.
 */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return ''
  if (!looksLikeHtml(html)) return html

  const doc = typeof DOMParser !== 'undefined' ? new DOMParser().parseFromString(html, 'text/html') : null
  if (!doc?.body) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const kids = Array.from(el.childNodes).map(walk).join('')

    switch (tag) {
      case 'h1':
        return `# ${kids.trim()}\n\n`
      case 'h2':
        return `## ${kids.trim()}\n\n`
      case 'h3':
        return `### ${kids.trim()}\n\n`
      case 'h4':
        return `#### ${kids.trim()}\n\n`
      case 'p':
        return `${kids.trim()}\n\n`
      case 'br':
        return '\n'
      case 'strong':
      case 'b':
        return `**${kids}**`
      case 'em':
      case 'i':
        return `*${kids}*`
      case 's':
      case 'strike':
        return `~~${kids}~~`
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre' ? kids : `\`${kids}\``
      case 'pre':
        return `\`\`\`\n${kids.trim()}\n\`\`\`\n\n`
      case 'blockquote':
        return kids
          .trim()
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n') + '\n\n'
      case 'li': {
        const parent = el.parentElement?.tagName.toLowerCase()
        const prefix = parent === 'ol' ? '1. ' : '- '
        return `${prefix}${kids.trim()}\n`
      }
      case 'ul':
      case 'ol':
        return `${kids}\n`
      case 'hr':
        return '---\n\n'
      case 'a': {
        const href = el.getAttribute('href') ?? ''
        return href ? `[${kids}](${href})` : kids
      }
      default:
        return kids
    }
  }

  return Array.from(doc.body.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim()
}

/** Normalize draft body for export pipelines that expect Markdown. */
export function draftContentToMarkdown(content: string): string {
  return looksLikeHtml(content) ? htmlToMarkdown(content) : content
}

/** Plain text for short fields (Title, Keywords). Preserves spaces for editing. */
export function draftContentToPlainText(content: string): string {
  if (!content.trim()) return ''
  if (looksLikeHtml(content)) {
    return content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
  }
  return content
}

