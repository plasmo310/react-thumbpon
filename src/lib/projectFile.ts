import { getAssetBlob, replaceAssets } from './assetStore'
import { useEditorStore } from '../store/editorStore'
import type { AssetMeta, ProjectFile, Thumbnail } from '../types/editor'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('読み込みに失敗しました'))
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

export async function buildProjectFile(): Promise<ProjectFile> {
  const { folders, thumbnails, currentThumbnailId, assets } = useEditorStore.getState()
  const entries: ProjectFile['assets'] = []
  for (const meta of assets) {
    const blob = await getAssetBlob(meta.id)
    if (!blob) continue
    entries.push({ meta, dataUrl: await blobToDataUrl(blob) })
  }
  return {
    format: 'thumbpon-project',
    version: 1,
    folders,
    thumbnails,
    currentThumbnailId,
    assets: entries,
  }
}

export async function downloadProject() {
  const project = await buildProjectFile()
  const blob = new Blob([JSON.stringify(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `thumbpon-project-${new Date().toISOString().slice(0, 10)}.thumbpon.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectFile>
  return (
    candidate.format === 'thumbpon-project' &&
    Array.isArray(candidate.thumbnails) &&
    Array.isArray(candidate.folders)
  )
}

export async function importProjectFile(file: File) {
  const parsed: unknown = JSON.parse(await file.text())
  if (!isProjectFile(parsed)) throw new Error('サムネぽんのプロジェクトファイルではありません')

  const entries: { meta: AssetMeta; blob: Blob }[] = []
  for (const asset of parsed.assets ?? []) {
    entries.push({ meta: asset.meta, blob: await dataUrlToBlob(asset.dataUrl) })
  }
  const assets = await replaceAssets(entries)

  const thumbnails: Thumbnail[] = parsed.thumbnails
  useEditorStore.setState({ assets })
  useEditorStore.getState().loadProject({
    folders: parsed.folders,
    thumbnails,
    currentThumbnailId: parsed.currentThumbnailId,
  })
}
