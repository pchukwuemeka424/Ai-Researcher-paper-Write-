import Image from '@tiptap/extension-image'
import { getAsset } from '@/components/research-note/storage/repositories'
import type { RichTextDoc } from '@/components/research-note/storage/types'

/**
 * Image extension that carries a stable `data-asset-id`. The actual bytes live
 * in the IndexedDB `assets` store (not inline in the note), so notes stay small.
 * The ephemeral `src` (a blob object URL) is re-resolved from the asset id each
 * time the page loads.
 */
export const AssetImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-asset-id': {
        default: null,
        parseHTML: (el) => el.getAttribute('data-asset-id'),
        renderHTML: (attrs) =>
          attrs['data-asset-id']
            ? { 'data-asset-id': attrs['data-asset-id'] as string }
            : {},
      },
    }
  },
})

type JSONNode = { type?: string; attrs?: Record<string, unknown>; content?: JSONNode[] }

/**
 * Walk a doc and replace each asset-backed image's `src` with a fresh object URL
 * built from its stored blob. Registers created URLs so the caller can revoke
 * them on unmount (avoids leaks).
 */
export async function resolveImageAssets(
  doc: RichTextDoc,
  register: (url: string) => void,
): Promise<RichTextDoc> {
  const clone = structuredClone(doc) as JSONNode
  const walk = async (node: JSONNode): Promise<void> => {
    const assetId = node.attrs?.['data-asset-id']
    if (node.type === 'image' && typeof assetId === 'string') {
      const asset = await getAsset(assetId)
      if (asset) {
        const url = URL.createObjectURL(asset.blob)
        register(url)
        node.attrs!.src = url
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) await walk(child)
    }
  }
  await walk(clone)
  return clone as RichTextDoc
}
