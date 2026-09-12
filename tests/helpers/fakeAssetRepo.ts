import type { AssetFolder, AssetMeta } from '@/domain/asset'

/**
 * src/shared/lib/storage/assetRepo.ts を、メモリ上の Map に置き換えたもの。
 * IndexedDB は Node では動かないため。
 */
export const blobs = new Map<string, Blob>()

/** 保存された素材のメタとフォルダ。書き戻せていることの確認に使う */
export const saved = { metas: [] as AssetMeta[], folders: [] as AssetFolder[] }

/** 保存済みの素材をすべて消す。各テストの beforeEach で呼ぶ */
export function resetAssets() {
  blobs.clear()
  saved.metas = []
  saved.folders = []
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

export const getAssetUrl = (id: string | null | undefined) => (id ? `blob:${id}` : undefined)

export const loadAssetLibrary = async () => ({ assets: saved.metas, folders: saved.folders })

export const saveAsset = async (meta: AssetMeta, blob: Blob, allMetas: AssetMeta[]) => {
  blobs.set(meta.id, blob)
  saved.metas = allMetas
}

export const saveAssetMetas = async (metas: AssetMeta[]) => {
  saved.metas = metas
}

export const saveAssetFolders = async (folders: AssetFolder[]) => {
  saved.folders = folders
}

export const deleteAsset = async (id: string, remainingMetas: AssetMeta[]) => {
  blobs.delete(id)
  saved.metas = remainingMetas
}

export const readImageSize = async () => ({ width: 10, height: 10 })

export const replaceAssets = async (
  entries: { meta: AssetMeta; blob: Blob }[],
  folders: AssetFolder[] = [],
) => {
  blobs.clear()
  for (const entry of entries) blobs.set(entry.meta.id, entry.blob)
  saved.metas = entries.map((entry) => entry.meta)
  saved.folders = folders
  return saved.metas
}
