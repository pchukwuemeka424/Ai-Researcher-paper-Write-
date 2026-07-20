import { getAsset } from '@/components/research-note/storage/repositories'
import type { RichTextDoc } from '@/components/research-note/storage/types'

/**
 * Word document import/export. `mammoth` (.docx → HTML) and `docx` (JSON →
 * .docx) are both loaded with dynamic import() so they only download when the
 * user opens or exports a document. Fully client-side, cross-platform.
 *
 * This is a *semantic* round-trip: text, headings, bold/italic/strike, lists,
 * blockquotes, code, and images survive; complex Word styling is simplified.
 */

/** True for a real .docx (zip/OOXML). Legacy binary .doc is not supported. */
export function isDocx(file: File): boolean {
  return /\.docx$/i.test(file.name)
}

/** Convert a .docx into HTML suitable for `editor.commands.setContent`. */
export async function importDocxToHtml(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value
}

/** Extract plain text from a .docx (used for upload-to-learn templates). */
export async function importDocxToText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

type Mark = { type: string }
type DocNode = {
  type?: string
  text?: string
  marks?: Mark[]
  attrs?: Record<string, unknown>
  content?: DocNode[]
}

function imageTypeFromMime(mime: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  if (/jpe?g/i.test(mime)) return 'jpg'
  if (/gif/i.test(mime)) return 'gif'
  if (/bmp/i.test(mime)) return 'bmp'
  return 'png'
}

/** Build and download a .docx from a TipTap/ProseMirror document. */
export async function exportDocToDocx(
  doc: RichTextDoc | null,
  fileBase: string,
): Promise<void> {
  const docx = await import('docx')
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    HeadingLevel,
    AlignmentType,
  } = docx

  const runsFrom = (node: DocNode) => {
    const runs: InstanceType<typeof TextRun>[] = []
    for (const child of node.content ?? []) {
      if (child.type === 'text' && child.text) {
        const marks = new Set((child.marks ?? []).map((m) => m.type))
        runs.push(
          new TextRun({
            text: child.text,
            bold: marks.has('bold'),
            italics: marks.has('italic'),
            strike: marks.has('strike'),
            font: marks.has('code') ? 'Consolas' : undefined,
          }),
        )
      } else if (child.type === 'hardBreak') {
        runs.push(new TextRun({ text: '', break: 1 }))
      }
    }
    return runs
  }

  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
  ]

  const blocks: InstanceType<typeof Paragraph>[] = []

  const emitBlock = async (node: DocNode, listKind?: 'bullet' | 'ordered') => {
    switch (node.type) {
      case 'heading': {
        const level = Math.min(4, Math.max(1, Number(node.attrs?.level ?? 1)))
        blocks.push(
          new Paragraph({ heading: HEADINGS[level - 1], children: runsFrom(node) }),
        )
        break
      }
      case 'paragraph': {
        blocks.push(
          new Paragraph({
            children: runsFrom(node),
            ...(listKind === 'bullet' ? { bullet: { level: 0 } } : {}),
            ...(listKind === 'ordered'
              ? { numbering: { reference: 'rp-ordered', level: 0 } }
              : {}),
          }),
        )
        break
      }
      case 'blockquote':
        for (const child of node.content ?? []) {
          blocks.push(
            new Paragraph({
              children: runsFrom(child),
              indent: { left: 480 },
              alignment: AlignmentType.START,
            }),
          )
        }
        break
      case 'codeBlock':
        blocks.push(
          new Paragraph({
            children: [
              new TextRun({ text: textOf(node), font: 'Consolas', size: 20 }),
            ],
          }),
        )
        break
      case 'bulletList':
      case 'orderedList': {
        const kind = node.type === 'bulletList' ? 'bullet' : 'ordered'
        for (const item of node.content ?? []) {
          for (const child of item.content ?? []) await emitBlock(child, kind)
        }
        break
      }
      case 'image': {
        const p = await imageParagraph(node)
        if (p) blocks.push(p)
        break
      }
      default:
        if (node.content) for (const child of node.content) await emitBlock(child)
    }
  }

  const imageParagraph = async (node: DocNode) => {
    const assetId = node.attrs?.['data-asset-id']
    if (typeof assetId !== 'string') return null
    const asset = await getAsset(assetId)
    if (!asset) return null
    const data = new Uint8Array(await asset.blob.arrayBuffer())
    let width = 400
    let height = 300
    try {
      const bmp = await createImageBitmap(asset.blob)
      const scale = Math.min(1, 500 / bmp.width)
      width = Math.round(bmp.width * scale)
      height = Math.round(bmp.height * scale)
    } catch {
      /* keep defaults */
    }
    return new Paragraph({
      children: [
        new ImageRun({
          data,
          type: imageTypeFromMime(asset.mime),
          transformation: { width, height },
        }),
      ],
    })
  }

  for (const node of (doc as DocNode | null)?.content ?? []) {
    await emitBlock(node)
  }
  if (blocks.length === 0) blocks.push(new Paragraph({ children: [] }))

  const document = new Document({
    numbering: {
      config: [
        {
          reference: 'rp-ordered',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children: blocks }],
  })

  const blob = await Packer.toBlob(document)
  downloadBlob(blob, `${fileBase || 'document'}.docx`)
}

function textOf(node: DocNode): string {
  if (node.text) return node.text
  return (node.content ?? []).map(textOf).join('')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
