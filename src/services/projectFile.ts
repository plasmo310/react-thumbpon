import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { downloadBlob } from '../lib/dom/download'
import { applyProjectFile, buildProjectFile, collectAssetPayloads, isProjectFile } from './projectData'

const PROJECT_JSON = 'project.json'

const stamp = () => new Date().toISOString().slice(0, 10)

/**
 * 現在のプロジェクトを1つのファイルとして書き出す。
 * 中身はワークスペースフォルダと同じ構成（project.json + assets/）をそのまま固めた ZIP。
 * 拡張子を .zip で終わらせているのは、OS からただの ZIP として解凍・閲覧できるようにするため。
 * 手前の .thumbpon はサムネぽんのプロジェクトだと一目で分かるようにしているだけ。
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
    `thumbpon-${stamp()}.thumbpon.zip`,
  )
}

/**
 * ZIP の中で project.json がある位置を探す。
 * フォルダごとOSの機能で圧縮すると中身が「フォルダ名/」の下に入るため、直下とは限らない。
 *
 * @param entries unzipSync の結果
 * @returns project.json のエントリ名。無ければ undefined。
 *          浅いものを優先し、素材のパスもここからの相対として解決する
 */
function findProjectRoot(entries: Record<string, Uint8Array>): string | undefined {
  return Object.keys(entries)
    .filter((name) => name === PROJECT_JSON || name.endsWith(`/${PROJECT_JSON}`))
    .sort((a, b) => a.length - b.length)[0]
}

/**
 * プロジェクトファイルを読み込んで、現在の内容を置き換える。
 * フォントファイルは含まれないため、足りないものは読み込み後に告知される。
 *
 * @param file .thumbpon.zip か 旧 .thumbpon.json。ZIP かどうかは先頭バイトで判別する
 */
export async function importProjectFile(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b

  let parsed: unknown
  let unzipped: Record<string, Uint8Array> | null = null

  let prefix = ''

  if (isZip) {
    unzipped = unzipSync(buffer)
    const root = findProjectRoot(unzipped)
    if (!root) throw new Error(`${PROJECT_JSON} が見つかりません`)
    prefix = root.slice(0, root.length - PROJECT_JSON.length)
    parsed = JSON.parse(strFromU8(unzipped[root]))
  } else {
    parsed = JSON.parse(strFromU8(buffer))
  }

  if (!isProjectFile(parsed)) throw new Error('サムネぽんのプロジェクトファイルではありません')

  const blobs = new Map<string, Blob>()
  for (const asset of parsed.assets ?? []) {
    if (asset.file && unzipped) {
      const bytes = unzipped[prefix + asset.file]
      if (!bytes) continue
      blobs.set(asset.meta.id, new Blob([bytes as BlobPart], { type: asset.meta.mime }))
    } else if (asset.dataUrl) {
      // 旧 .thumbpon.json は画像を dataURL で埋め込んでいる
      blobs.set(asset.meta.id, await (await fetch(asset.dataUrl)).blob())
    }
  }

  await applyProjectFile(parsed, blobs)
}
