import {
  canUseFileSystemAccess,
  clearHandle,
  getCurrentDirectory,
  getSubDirectory,
  listNames,
  loadHandle,
  pickDirectory,
  readFile,
  removeFile,
  saveHandle,
  setCurrentDirectory,
  verifyPermission,
  writeFile,
} from '../lib/storage/fsAccess'
import { useEditorStore } from '../store'
import {
  applyProjectFile,
  buildProjectFile,
  collectAssetPayloads,
  isProjectFile,
} from './projectData'

const PROJECT_JSON = 'project.json'
const ASSETS_DIR = 'assets'

type Directory = NonNullable<ReturnType<typeof getCurrentDirectory>>

/** assets/<id>.png のうち、assets/ を除いた部分。フォルダ内ではこれがファイル名になる */
const fileNameOf = (path: string) => path.slice(ASSETS_DIR.length + 1)

/**
 * フォルダの内容を読み込んで現在の状態を置き換える。
 *
 * @param dir 読み込み元のワークスペースフォルダ
 * @returns project.json が無ければ false（空のフォルダを選んだ場合）
 */
async function loadFrom(dir: Directory): Promise<boolean> {
  const file = await readFile(dir, PROJECT_JSON)
  if (!file) return false

  const parsed: unknown = JSON.parse(await file.text())
  if (!isProjectFile(parsed)) throw new Error(`${PROJECT_JSON} がサムネぽんの形式ではありません`)

  const assetsDir = await getSubDirectory(dir, ASSETS_DIR, false)
  const blobs = new Map<string, Blob>()
  if (assetsDir) {
    for (const asset of parsed.assets ?? []) {
      if (!asset.file) continue
      const entry = await readFile(assetsDir, fileNameOf(asset.file))
      if (entry) blobs.set(asset.meta.id, entry)
    }
  }

  await applyProjectFile(parsed, blobs)
  return true
}

/**
 * 現在の状態をフォルダに書き出す。
 * 素材は既にあるファイルを書き直さず、増減分だけを反映する。
 *
 * @param dir 書き込み先のワークスペースフォルダ
 */
async function saveTo(dir: Directory) {
  const payloads = await collectAssetPayloads()
  const assetsDir = await getSubDirectory(dir, ASSETS_DIR, true)
  if (!assetsDir) throw new Error(`${ASSETS_DIR}/ を作成できませんでした`)

  const existing = await listNames(assetsDir)
  const wanted = new Set(payloads.map(({ path }) => fileNameOf(path)))

  for (const { blob, path } of payloads) {
    const name = fileNameOf(path)
    // 画像の中身は id に紐づいて変わらないので、既にあるなら書き直さない
    if (existing.has(name)) continue
    await writeFile(assetsDir, name, blob)
  }
  for (const name of existing) {
    if (!wanted.has(name)) await removeFile(assetsDir, name)
  }

  const project = buildProjectFile(payloads)
  await writeFile(dir, PROJECT_JSON, JSON.stringify(project, null, 2))
  useEditorStore.getState().markWorkspaceSaved()
}

/**
 * フォルダを接続する。中身があれば読み込み、空なら現在の内容をそこに書き出す。
 * 「保存」を未接続の状態で押したときもここに来る（保存先を聞かれる形になる）。
 *
 * @returns 接続できたか。ダイアログのキャンセルや確認の取り消しでは false
 */
export async function openProjectFolder(): Promise<boolean> {
  const dir = await pickDirectory()
  if (!dir) return false
  if (!(await verifyPermission(dir, true)))
    throw new Error('フォルダへの書き込みが許可されませんでした')

  const hasProject = (await readFile(dir, PROJECT_JSON)) !== null
  if (hasProject) {
    if (!window.confirm(`「${dir.name}」の内容を読み込みます。現在の内容は破棄されます。`)) {
      return false
    }
    await loadFrom(dir)
  }

  setCurrentDirectory(dir)
  await saveHandle(dir)
  useEditorStore.getState().setWorkspace('connected', dir.name)

  // 空のフォルダなら、今の内容をそのまま置いて作業場所にする
  if (!hasProject) await saveTo(dir)
  else useEditorStore.getState().markWorkspaceSaved()

  return true
}

/**
 * 起動時に、前回のフォルダへ繋ぎ直す。
 * 権限の要求はユーザー操作の中からしか通らないので、ここでは要求せず状態を立てるだけにする。
 *
 * @returns フォルダの内容で状態を置き換えたか。false なら IndexedDB の内容のまま続ける
 */
export async function restoreProjectFolder(): Promise<boolean> {
  if (!canUseFileSystemAccess()) return false

  const dir = await loadHandle()
  if (!dir) return false

  const store = useEditorStore.getState()
  if (!(await verifyPermission(dir, false))) {
    store.setWorkspace('needs-permission', dir.name)
    return false
  }

  setCurrentDirectory(dir)
  store.setWorkspace('connected', dir.name)
  const loaded = await loadFrom(dir)
  useEditorStore.getState().markWorkspaceSaved()
  return loaded
}

/**
 * 権限が切れたフォルダに繋ぎ直す。
 * 権限ダイアログを出すため、必ずユーザーの操作から呼ぶこと。
 */
export async function reconnectProjectFolder() {
  const dir = await loadHandle()
  if (!dir) {
    useEditorStore.getState().setWorkspace('none', null)
    return
  }
  if (!(await verifyPermission(dir, true))) return

  setCurrentDirectory(dir)
  useEditorStore.getState().setWorkspace('connected', dir.name)
  await loadFrom(dir)
  useEditorStore.getState().markWorkspaceSaved()
}

/**
 * 現在の内容をフォルダに保存する。
 * 未接続なら先にフォルダを選んでもらう（＝保存先を聞く）。
 */
export async function saveProjectFolder() {
  const dir = getCurrentDirectory()
  if (!dir) {
    await openProjectFolder()
    return
  }
  if (!(await verifyPermission(dir, true))) {
    useEditorStore.getState().setWorkspace('needs-permission', dir.name)
    throw new Error('フォルダへの書き込みが許可されませんでした')
  }
  await saveTo(dir)
}

/** フォルダを切り離して、ブラウザ内(IndexedDB)だけの作業に戻す */
export async function disconnectProjectFolder() {
  setCurrentDirectory(null)
  await clearHandle()
  useEditorStore.getState().setWorkspace('none', null)
}
