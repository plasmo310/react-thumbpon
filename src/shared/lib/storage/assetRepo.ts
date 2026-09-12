import { del, get, set } from 'idb-keyval'
import { kv } from './db'
import type { AssetMeta } from '@/domain/asset'

const META_KEY = 'meta:list'
const blobKey = (id: string) => `blob:${id}`

/** objectURL はメモリ上だけで保持し、store の state には入れない（状態を JSON 化可能に保つため） */
const urlCache = new Map<string, string>()

/**
 * 素材の表示に使う objectURL を得る。
 *
 * @param id 素材の id。null / undefined を渡せる（背景の未選択をそのまま扱えるように）
 * @returns 読み込み前など、キャッシュに無ければ undefined
 */
export function getAssetUrl(id: string | null | undefined): string | undefined {
  if (!id) return undefined
  return urlCache.get(id)
}

/**
 * objectURL を作り直してキャッシュする。古いものは revoke する。
 *
 * @param id   素材の id
 * @param blob 画像の実体
 */
function cacheUrl(id: string, blob: Blob) {
  const previous = urlCache.get(id)
  if (previous) URL.revokeObjectURL(previous)
  urlCache.set(id, URL.createObjectURL(blob))
}

/**
 * 保存済みの素材をすべて読み込み、objectURL を張り直す。
 * 実体を失っているメタは取り除いた上で保存し直す。
 */
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

/**
 * 素材を1件保存する。
 *
 * @param meta     保存する素材のメタ情報
 * @param blob     画像の実体
 * @param allMetas 保存後のメタ一覧。一覧はまるごと置き換えるので呼び出し側で作って渡す
 */
export async function saveAsset(meta: AssetMeta, blob: Blob, allMetas: AssetMeta[]) {
  await set(blobKey(meta.id), blob, kv)
  await set(META_KEY, allMetas, kv)
  cacheUrl(meta.id, blob)
}

/**
 * 素材を1件削除する。
 *
 * @param id             削除する素材の id
 * @param remainingMetas 削除後に残るメタ一覧
 */
export async function deleteAsset(id: string, remainingMetas: AssetMeta[]) {
  await del(blobKey(id), kv)
  await set(META_KEY, remainingMetas, kv)
  const url = urlCache.get(id)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(id)
}

/**
 * 素材の実体を取り出す。プロジェクトの書き出しで使う。
 *
 * @param id 取り出す素材の id
 */
export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(blobKey(id), kv)
}

/**
 * プロジェクト読み込み時に素材をまるごと入れ替える。既存の素材と objectURL は破棄する。
 *
 * @param entries 読み込んだプロジェクトが持つ素材の一覧
 * @returns 入れ替え後のメタ一覧。そのまま store に載せる
 */
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

/**
 * 画像ファイルから自然サイズを読み取る。
 *
 * @param file 対象の画像。SVG など createImageBitmap 非対応の形式は <img> にフォールバックする
 */
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
