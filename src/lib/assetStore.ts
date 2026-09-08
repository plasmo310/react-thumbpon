import { del, get, set } from 'idb-keyval'
import { kv } from './db'
import type { AssetMeta } from '../types'

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
  const metas = (await get<AssetMeta[]>(META_KEY, kv)) ?? []
  const available: AssetMeta[] = []
  for (const meta of metas) {
    const blob = await get<Blob>(blobKey(meta.id), kv)
    if (!blob) continue
    cacheUrl(meta.id, blob)
    available.push(meta)
  }
  if (available.length !== metas.length) await set(META_KEY, available, kv)
  return available
}

export async function saveAsset(meta: AssetMeta, blob: Blob, allMetas: AssetMeta[]) {
  await set(blobKey(meta.id), blob, kv)
  await set(META_KEY, allMetas, kv)
  cacheUrl(meta.id, blob)
}

export async function deleteAsset(id: string, remainingMetas: AssetMeta[]) {
  await del(blobKey(id), kv)
  await set(META_KEY, remainingMetas, kv)
  const url = urlCache.get(id)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(id)
}

export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(blobKey(id), kv)
}

/** プロジェクト読み込み時に素材をまるごと入れ替える */
export async function replaceAssets(entries: { meta: AssetMeta; blob: Blob }[]) {
  const previous = (await get<AssetMeta[]>(META_KEY, kv)) ?? []
  for (const meta of previous) await del(blobKey(meta.id), kv)
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()

  const metas = entries.map((e) => e.meta)
  for (const entry of entries) {
    await set(blobKey(entry.meta.id), entry.blob, kv)
    cacheUrl(entry.meta.id, entry.blob)
  }
  await set(META_KEY, metas, kv)
  return metas
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
