import type { AssetMeta } from '@/core/model/types'

/**
 * src/core/storage/assetRepo.ts のうち、プロジェクトの入出力が使う部分だけを
 * メモリ上の Map に置き換えたもの。IndexedDB は Node では動かないため。
 */
export const blobs = new Map<string, Blob>()

/** 保存済みの素材をすべて消す。各テストの beforeEach で呼ぶ */
export function resetAssets() {
  blobs.clear()
}

/**
 * 素材の実体を積む。テストの下準備用（本物には無い関数）。
 *
 * @param id   素材の id
 * @param blob 実体。中身は何でもよいので短い文字列で作る
 */
export function seedAsset(id: string, blob: Blob) {
  blobs.set(id, blob)
}

export const getAssetBlob = async (id: string) => blobs.get(id)

export const replaceAssets = async (entries: { meta: AssetMeta; blob: Blob }[]) => {
  blobs.clear()
  for (const entry of entries) blobs.set(entry.meta.id, entry.blob)
  return entries.map((entry) => entry.meta)
}
