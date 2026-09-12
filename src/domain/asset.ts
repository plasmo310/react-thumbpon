import { createId } from './id'

/**
 * 素材画像のメタ情報。画像の実体は IndexedDB に、objectURL は assetRepo の Map にある。
 * ストアへはこのメタだけを載せる（状態を JSON 化可能に保つため）。
 */
export type AssetMeta = {
  id: string
  name: string
  mime: string
  width: number
  height: number
  createdAt: number
  /** 所属フォルダ。null は未分類 */
  folderId: string | null
}

/** 素材をまとめるフォルダ。サムネイルの Folder と同じ形だが、別の一覧なので型も分ける */
export type AssetFolder = { id: string; name: string; collapsed: boolean }

/**
 * 素材フォルダを作る。
 *
 * @param name 一覧に表示する名前
 */
export function createAssetFolder(name: string): AssetFolder {
  return { id: createId(), name, collapsed: false }
}

/**
 * 読み込んだ素材のメタに、後から増えたフィールドの既定値を埋める。
 * フォルダを持たない頃に保存したものと、フォルダだけ失われたものをここで吸収する。
 *
 * @param assets  読み込んだメタ一覧。保存済みデータ由来なので欠けを前提にする
 * @param folders 現在あるフォルダ。ここに無いフォルダを指すものは未分類に落とす
 */
export function normalizeAssets(assets: AssetMeta[], folders: AssetFolder[]): AssetMeta[] {
  const known = new Set(folders.map((folder) => folder.id))
  return assets.map((asset) => ({
    ...asset,
    folderId: asset.folderId && known.has(asset.folderId) ? asset.folderId : null,
  }))
}
