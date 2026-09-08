import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { downloadBlob } from './dom/download'
import { getAssetBlob, replaceAssets } from './storage/assetRepo'
import { useEditorStore } from '../store/editorStore'
import type { AssetMeta, ProjectAssetEntry, ProjectFile } from '../types'

export type ProjectFormat = 'zip' | 'json'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
}

function extensionFor(meta: AssetMeta): string {
  const fromName = /\.[a-z0-9]+$/i.exec(meta.name)?.[0]
  return EXTENSION_BY_MIME[meta.mime] ?? fromName ?? '.bin'
}

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

function baseProject(): Omit<ProjectFile, 'assets'> {
  const { folders, thumbnails, currentThumbnailId, textPresets, backgroundPresets } =
    useEditorStore.getState()
  return {
    format: 'thumbpon-project',
    version: 1,
    folders,
    thumbnails,
    currentThumbnailId,
    textPresets,
    backgroundPresets,
  }
}

const stamp = () => new Date().toISOString().slice(0, 10)

/**
 * ZIP 形式で保存する。画像は元のバイト列のまま assets/ に入るので、
 * base64 で埋め込む JSON 形式より約 1/1.33 のサイズで済む。
 */
async function downloadZip() {
  const { assets } = useEditorStore.getState()
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 | 6 }]> = {}
  const entries: ProjectAssetEntry[] = []

  for (const meta of assets) {
    const blob = await getAssetBlob(meta.id)
    if (!blob) continue
    const path = `assets/${meta.id}${extensionFor(meta)}`
    // 画像は既に圧縮済みなので再圧縮しない
    files[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
    entries.push({ meta, file: path })
  }

  const project: ProjectFile = { ...baseProject(), assets: entries }
  files['project.json'] = [strToU8(JSON.stringify(project, null, 2)), { level: 6 }]

  const zipped = zipSync(files)
  downloadBlob(
    new Blob([zipped as BlobPart], { type: 'application/zip' }),
    `thumbpon-${stamp()}.thumbpon.zip`,
  )
}

/** JSON 単体で保存する。画像は dataURL として埋め込まれる */
async function downloadJson() {
  const { assets } = useEditorStore.getState()
  const entries: ProjectAssetEntry[] = []
  for (const meta of assets) {
    const blob = await getAssetBlob(meta.id)
    if (!blob) continue
    entries.push({ meta, dataUrl: await blobToDataUrl(blob) })
  }
  const project: ProjectFile = { ...baseProject(), assets: entries }
  downloadBlob(
    new Blob([JSON.stringify(project)], { type: 'application/json' }),
    `thumbpon-${stamp()}.thumbpon.json`,
  )
}

export async function downloadProject(format: ProjectFormat) {
  if (format === 'zip') await downloadZip()
  else await downloadJson()
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
  const buffer = new Uint8Array(await file.arrayBuffer())
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b

  let project: unknown
  let unzipped: Record<string, Uint8Array> | null = null

  if (isZip) {
    unzipped = unzipSync(buffer)
    const json = unzipped['project.json']
    if (!json) throw new Error('project.json が見つかりません')
    project = JSON.parse(strFromU8(json))
  } else {
    project = JSON.parse(strFromU8(buffer))
  }

  if (!isProjectFile(project)) throw new Error('サムネぽんのプロジェクトファイルではありません')

  const entries: { meta: AssetMeta; blob: Blob }[] = []
  for (const asset of project.assets ?? []) {
    if (asset.file && unzipped) {
      const bytes = unzipped[asset.file]
      if (!bytes) continue
      entries.push({ meta: asset.meta, blob: new Blob([bytes as BlobPart], { type: asset.meta.mime }) })
    } else if (asset.dataUrl) {
      entries.push({ meta: asset.meta, blob: await dataUrlToBlob(asset.dataUrl) })
    }
  }

  const assets = await replaceAssets(entries)
  useEditorStore.setState({ assets })
  useEditorStore.getState().loadProject({
    folders: project.folders,
    thumbnails: project.thumbnails,
    currentThumbnailId: project.currentThumbnailId,
    textPresets: project.textPresets,
    backgroundPresets: project.backgroundPresets,
  })
}
