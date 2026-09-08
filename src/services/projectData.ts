import { assetPath, collectUsedFonts, findMissingFonts } from '../lib/core/project'
import { getAssetBlob, replaceAssets } from '../lib/storage/assetRepo'
import { useEditorStore } from '../store'
import type { AssetMeta, ProjectAssetEntry, ProjectFile } from '../types'

/** 書き出し前に集めた素材。path は ZIP のエントリ名にもフォルダ内のパスにもそのまま使う */
export type AssetPayload = { meta: AssetMeta; blob: Blob; path: string }

/**
 * 現在の素材の実体をすべて取り出す。
 * 実体を失っているメタは黙って読み飛ばす（メタだけ残っていても復元できないため）。
 */
export async function collectAssetPayloads(): Promise<AssetPayload[]> {
  const { assets } = useEditorStore.getState()
  const payloads: AssetPayload[] = []
  for (const meta of assets) {
    const blob = await getAssetBlob(meta.id)
    if (!blob) continue
    payloads.push({ meta, blob, path: assetPath(meta) })
  }
  return payloads
}

/**
 * 現在の状態から保存する中身を組み立てる。ZIP とワークスペースフォルダで共通。
 *
 * @param payloads collectAssetPayloads() の結果。素材の参照はここから作る
 */
export function buildProjectFile(payloads: AssetPayload[]): ProjectFile {
  const { folders, thumbnails, currentThumbnailId, textPresets, backgroundPresets, fonts } =
    useEditorStore.getState()
  const entries: ProjectAssetEntry[] = payloads.map(({ meta, path }) => ({ meta, file: path }))

  return {
    format: 'thumbpon-project',
    version: 2,
    folders,
    thumbnails,
    currentThumbnailId,
    textPresets,
    backgroundPresets,
    assets: entries,
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
  const entries = project.assets
    .filter((asset) => blobs.has(asset.meta.id))
    .map((asset) => ({ meta: asset.meta, blob: blobs.get(asset.meta.id) as Blob }))

  const assets = await replaceAssets(entries)
  const store = useEditorStore.getState()
  useEditorStore.setState({
    assets,
    missingFontLabels: findMissingFonts(project.fonts, store.fonts),
  })
  store.loadProject({
    folders: project.folders,
    thumbnails: project.thumbnails,
    currentThumbnailId: project.currentThumbnailId,
    textPresets: project.textPresets,
    backgroundPresets: project.backgroundPresets,
  })
}
