import { createStore, del, get, set } from 'idb-keyval'
import type { AssetMeta } from '../types/editor'

/**
 * idb-keyval の createStore は「DBを version 1 で開いて upgrade 時に objectStore を作る」ため、
 * 同じDB名で複数回呼ぶと2つ目の objectStore が作られず NotFoundError になる。
 * そのため objectStore は1つだけにして、キーの接頭辞で blob とメタを分ける。
 */
const store = createStore('thumbpon-assets', 'kv')
const META_KEY = 'meta:list'
const blobKey = (id: string) => `blob:${id}`

/** objectURL はメモリ上だけで保持し、store の state には入れない */
const urlCache = new Map<string, string>()

export function getAssetUrl(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  return urlCache.get(id)
}

function cacheUrl(id: string, blob: Blob) {
  const previous = urlCache.get(id)
  if (previous) URL.revokeObjectURL(previous)
  urlCache.set(id, URL.createObjectURL(blob))
}

export async function loadAssets(): Promise<AssetMeta[]> {
  const metas = (await get<AssetMeta[]>(META_KEY, store)) ?? []
  const available: AssetMeta[] = []
  for (const meta of metas) {
    const blob = await get<Blob>(blobKey(meta.id), store)
    if (!blob) continue
    cacheUrl(meta.id, blob)
    available.push(meta)
  }
  if (available.length !== metas.length) await set(META_KEY, available, store)
  return available
}

export async function saveAsset(meta: AssetMeta, blob: Blob, allMetas: AssetMeta[]) {
  await set(blobKey(meta.id), blob, store)
  await set(META_KEY, allMetas, store)
  cacheUrl(meta.id, blob)
}

export async function deleteAsset(id: string, remainingMetas: AssetMeta[]) {
  await del(blobKey(id), store)
  await set(META_KEY, remainingMetas, store)
  const url = urlCache.get(id)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(id)
}

/** 画像ファイルから自然サイズを読み取る */
export async function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function' && file.type !== 'image/svg+xml') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    } catch {
      // SVG など createImageBitmap 非対応の形式は <img> にフォールバック
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () =>
        resolve({ width: img.naturalWidth || 300, height: img.naturalHeight || 300 })
      img.onerror = () => reject(new Error('画像を読み込めませんでした'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
