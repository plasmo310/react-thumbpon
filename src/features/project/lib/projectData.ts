import { normalizeAssets } from '@/domain/asset'
import { assetPath, collectUsedFonts, findMissingFonts } from '@/domain/project'
import { getAssetBlob, replaceAssets } from '@/shared/lib/storage/assetRepo'
import { useEditorStore } from '@/app/store'
import type { AssetPayload, AssetReference } from '../types'
import type { AssetMeta } from '@/domain/asset'
import type { ProjectAssetEntry, ProjectFile } from '@/domain/project'

/**
 * 現在の素材の実体をすべて取り出す。
 * 実体を失っているメタは黙って読み飛ばす（メタだけ残っていても復元できないため）。
 */
export async function collectAssetPayloads(): Promise<AssetPayload[]> {
  const { assets, assetFolders } = useEditorStore.getState()
  const payloads: AssetPayload[] = []
  for (const meta of assets) {
    const blob = await getAssetBlob(meta.id)
    if (!blob) continue
    payloads.push({ meta, blob, path: assetPath(meta, assetFolders) })
  }
  return payloads
}

/**
 * 現在の状態から保存する中身を組み立てる。ZIP とワークスペースフォルダで共通。
 *
 * @param payloads 書き出す素材。素材の参照（メタと格納先パス）はここから作る。
 *                 実体を持たないもの（既にコンテナ側にあるファイル）も渡せる
 */
export function buildProjectFile(payloads: AssetReference[]): ProjectFile {
  const {
    folders,
    thumbnails,
    currentThumbnailId,
    textPresets,
    backgroundPresets,
    fonts,
    assetFolders,
  } = useEditorStore.getState()
  const entries: ProjectAssetEntry[] = payloads.map(({ meta, path }) => ({ meta, file: path }))

  return {
    format: 'thumbpon-project',
    version: 4,
    folders,
    thumbnails,
    currentThumbnailId,
    textPresets,
    backgroundPresets,
    assets: entries,
    assetFolders,
    fonts: collectUsedFonts(thumbnails, fonts),
  }
}

/**
 * 読み込んだ内容がサムネぽんのプロジェクトかどうか。
 *
 * @param value JSON.parse の結果
 */
export function isProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectFile>
  return (
    candidate.format === 'thumbpon-project' &&
    Array.isArray(candidate.thumbnails) &&
    Array.isArray(candidate.folders)
  )
}

/**
 * 読み込んだプロジェクトで現在の内容をまるごと置き換える。
 * フォントファイルは含まれないので、解決できなかったものは告知用に控える。
 *
 * @param project 読み込んだプロジェクト
 * @param blobs   素材の実体。素材の id で引ける形で渡す
 */
export async function applyProjectFile(project: ProjectFile, blobs: Map<string, Blob>) {
  const assetFolders = project.assetFolders ?? []
  const entries: { meta: AssetMeta; blob: Blob }[] = []
  const lost: string[] = []

  for (const asset of project.assets) {
    /*
     * コンテナ側に実体が無くても、同じ id の画像が IndexedDB に残っているならそれを使う。
     * 読み込みは replaceAssets で素材をまるごと入れ替えるので、ここで拾わないと
     * 「確かめられなかっただけ」の素材まで消えてしまう。
     */
    const blob = blobs.get(asset.meta.id) ?? (await getAssetBlob(asset.meta.id))
    if (blob) entries.push({ meta: asset.meta, blob })
    else lost.push(asset.meta.name)
  }

  const assets = await replaceAssets(entries, assetFolders)
  const store = useEditorStore.getState()
  useEditorStore.setState({
    // 素材フォルダを持たない頃のファイルもあるので、参照先の無いフォルダ指定は落とす
    assets: normalizeAssets(assets, assetFolders),
    assetFolders,
    missingFontLabels: findMissingFonts(project.fonts, store.fonts),
    // 黙って落とすと画像が消えた理由が分からないので、名前で知らせる
    missingAssetNames: lost,
  })
  store.loadProject({
    folders: project.folders,
    thumbnails: project.thumbnails,
    currentThumbnailId: project.currentThumbnailId,
    textPresets: project.textPresets,
    backgroundPresets: project.backgroundPresets,
  })
}
