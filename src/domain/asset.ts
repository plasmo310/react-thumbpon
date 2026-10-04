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

/** 素材をまとめるフォルダ。親への参照で任意の深さの階層を表す */
export type AssetFolder = {
  id: string
  name: string
  collapsed: boolean
  /** 親フォルダ。null / 省略は最上位（旧データとの互換性のため省略も許す） */
  parentId?: string | null
}

/**
 * 素材フォルダを作る。
 *
 * @param name 一覧に表示する名前
 * @param parentId 親フォルダ。null で最上位
 */
export function createAssetFolder(name: string, parentId: string | null = null): AssetFolder {
  return { id: createId(), name, collapsed: false, parentId }
}

/**
 * フォルダから最上位までの経路を求める。壊れた保存データの循環でも停止する。
 * @param id 起点のフォルダ。null で空の経路
 * @param folders 素材フォルダ一覧
 */
export function assetFolderAncestors(id: string | null, folders: AssetFolder[]): AssetFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const path: AssetFolder[] = []
  const visited = new Set<string>()
  let current = id
  while (current && !visited.has(current)) {
    const folder = byId.get(current)
    if (!folder) break
    visited.add(current)
    path.push(folder)
    current = folder.parentId ?? null
  }
  return path
}

/**
 * 不明な親や循環を最上位に戻し、旧データのフォルダも表示できるようにする。
 * @param folders 保存データから読み込んだ素材フォルダ一覧
 */
export function normalizeAssetFolders(folders: AssetFolder[]): AssetFolder[] {
  const known = new Set(folders.map((folder) => folder.id))
  return folders.map((folder) => {
    if (folder.parentId == null) return folder
    const invalid =
      !known.has(folder.parentId) ||
      assetFolderAncestors(folder.parentId, folders).some((parent) => parent.id === folder.id)
    return invalid ? { ...folder, parentId: null } : folder
  })
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
