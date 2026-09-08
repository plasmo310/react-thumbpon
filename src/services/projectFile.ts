import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { downloadBlob } from '../lib/dom/download'
import { applyProjectFile, buildProjectFile, collectAssetPayloads, isProjectFile } from './projectData'

const PROJECT_JSON = 'project.json'

const stamp = () => new Date().toISOString().slice(0, 10)

/**
 * 現在のプロジェクトを1つのファイルとして書き出す。
 * 中身は ZIP コンテナで、ワークスペースフォルダと同じ構成
 * （project.json + assets/）をそのまま固めたもの。
 */
export async function exportProjectFile() {
  const payloads = await collectAssetPayloads()
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {}

  for (const { blob, path } of payloads) {
    // 画像は既に圧縮済みなので再圧縮しない
    files[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]
  }

  const project = buildProjectFile(payloads)
  files[PROJECT_JSON] = [strToU8(JSON.stringify(project, null, 2)), { level: 6 }]

  const zipped = zipSync(files)
  downloadBlob(
    new Blob([zipped as BlobPart], { type: 'application/zip' }),
    `thumbpon-${stamp()}.thumbpon`,
  )
}

/**
 * プロジェクトファイルを読み込んで、現在の内容を置き換える。
 * フォントファイルは含まれないため、足りないものは読み込み後に告知される。
 *
 * @param file .thumbpon / 旧 .thumbpon.zip / 旧 .thumbpon.json のいずれか。先頭バイトで判別する
 */
export async function importProjectFile(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b

  let parsed: unknown
  let unzipped: Record<string, Uint8Array> | null = null

  if (isZip) {
    unzipped = unzipSync(buffer)
    const json = unzipped[PROJECT_JSON]
    if (!json) throw new Error(`${PROJECT_JSON} が見つかりません`)
    parsed = JSON.parse(strFromU8(json))
  } else {
    parsed = JSON.parse(strFromU8(buffer))
  }

  if (!isProjectFile(parsed)) throw new Error('サムネぽんのプロジェクトファイルではありません')

  const blobs = new Map<string, Blob>()
  for (const asset of parsed.assets ?? []) {
    if (asset.file && unzipped) {
      const bytes = unzipped[asset.file]
      if (!bytes) continue
      blobs.set(asset.meta.id, new Blob([bytes as BlobPart], { type: asset.meta.mime }))
    } else if (asset.dataUrl) {
      // 旧 .thumbpon.json は画像を dataURL で埋め込んでいる
      blobs.set(asset.meta.id, await (await fetch(asset.dataUrl)).blob())
    }
  }

  await applyProjectFile(parsed, blobs)
}
