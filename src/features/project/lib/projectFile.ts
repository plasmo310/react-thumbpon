import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  ASSETS_DIR,
  PROJECT_ZIP_EXTENSION,
  assetIdFromPath,
  defaultManifestName,
  findManifestEntry,
} from '@/domain/project'
import { useEditorStore } from '@/app/store'
import { downloadBlob } from './download'
import { disconnectProjectFolder } from './projectFolder'
import {
  applyProjectFile,
  buildProjectFile,
  collectAssetPayloads,
  isProjectFile,
} from './projectData'

const stamp = () => new Date().toISOString().slice(0, 10)

/**
 * 書き出す名前の元になる語幹。
 * 接続中のフォルダで使っている名前をそのまま使い、未接続なら日付にする
 * （フォルダとZIPで別の名前になると、同じプロジェクトだと分からなくなるため）。
 */
function projectBaseName(): string {
  const { workspaceFileName, workspaceFolderName } = useEditorStore.getState()
  const manifest =
    workspaceFileName ?? (workspaceFolderName && defaultManifestName(workspaceFolderName))
  return manifest ? manifest.slice(0, manifest.lastIndexOf('.')) : `thumbpon-${stamp()}`
}

/**
 * 現在のプロジェクトを1つのファイルとして書き出す。
 * 中身はワークスペースフォルダと同じ構成（マニフェスト + assets/）をそのまま固めた ZIP。
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

  const base = projectBaseName()
  const project = buildProjectFile(payloads)
  files[defaultManifestName(base)] = [strToU8(JSON.stringify(project, null, 2)), { level: 6 }]

  const zipped = zipSync(files)
  downloadBlob(
    new Blob([zipped as BlobPart], { type: 'application/zip' }),
    `${base}${PROJECT_ZIP_EXTENSION}`,
  )
}

/**
 * 1ファイル形式のプロジェクトを読み込んで、現在の内容を置き換える。
 * フォントファイルは含まれないため、足りないものは読み込み後に告知される。
 *
 * 読み込めたらワークスペースフォルダは切り離す。繋いだままだと、次の保存が
 * 前のフォルダを別プロジェクトの内容で上書きしてしまうため。
 *
 * @param file .thumbpon.zip。ZIP かどうかは拡張子ではなく先頭バイトで見分ける
 */
export async function importProjectFile(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b)
    throw new Error('サムネぽんのプロジェクトファイルではありません')

  const unzipped = unzipSync(buffer)
  const found = findManifestEntry(Object.keys(unzipped))
  if (!found) throw new Error('サムネぽんのプロジェクトファイルではありません')

  const parsed: unknown = JSON.parse(strFromU8(unzipped[found.path]))
  if (!isProjectFile(parsed)) throw new Error('サムネぽんのプロジェクトファイルではありません')

  /*
   * 書かれていたパスで引けなかったときの拾い直し用に、入っている素材を id で引けるようにする。
   * フォルダ名を解凍時に変えられても、ファイル名の id で元の素材に結び付く。
   */
  const byId = new Map<string, Uint8Array>()
  for (const name of Object.keys(unzipped)) {
    if (!name.startsWith(`${found.prefix}${ASSETS_DIR}/`)) continue
    byId.set(assetIdFromPath(name), unzipped[name])
  }

  const blobs = new Map<string, Blob>()
  for (const asset of parsed.assets ?? []) {
    const recorded = asset.file ? unzipped[found.prefix + asset.file] : undefined
    const bytes = recorded ?? byId.get(asset.meta.id)
    if (bytes) blobs.set(asset.meta.id, new Blob([bytes as BlobPart], { type: asset.meta.mime }))
  }

  await applyProjectFile(parsed, blobs)
  await disconnectProjectFolder()
}
