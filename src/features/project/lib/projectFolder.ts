import {
  canUseFileSystemAccess,
  clearHandle,
  getCurrentDirectory,
  getSubDirectory,
  listEntries,
  loadHandle,
  pickDirectory,
  readFile,
  removeEntry,
  saveHandle,
  setCurrentDirectory,
  verifyPermission,
  writeFile,
} from '@/shared/lib/storage/fsAccess'
import { assetIdFromPath } from '@/domain/project'
import { useEditorStore } from '@/app/store'
import {
  applyProjectFile,
  buildProjectFile,
  collectAssetPayloads,
  isProjectFile,
} from './projectData'

const PROJECT_JSON = 'project.json'
const ASSETS_DIR = 'assets'

type Directory = NonNullable<ReturnType<typeof getCurrentDirectory>>

/**
 * パスの途中のフォルダをたどる。素材は素材フォルダごとに分かれるので、
 * 'assets/風景/x.png' のように階層を持つパスをそのまま扱えるようにする。
 *
 * @param root   起点のフォルダ
 * @param path   root からの相対パス。最後の要素はファイル名として扱い、たどらない
 * @param create 途中のフォルダが無いときに作るか
 * @returns ファイルを置くフォルダとファイル名。create が false で辿れなければ null
 */
async function resolvePath(
  root: Directory,
  path: string,
  create: boolean,
): Promise<{ dir: Directory; name: string } | null> {
  const segments = path.split('/')
  const name = segments.pop() as string
  let dir = root
  for (const segment of segments) {
    const child = await getSubDirectory(dir, segment, create)
    if (!child) return null
    dir = child
  }
  return { dir, name }
}

/**
 * 相対パスを指定してファイルを読む。
 *
 * @param root 起点のフォルダ
 * @param path root からの相対パス
 * @returns 無ければ null
 */
async function readAt(root: Directory, path: string): Promise<File | null> {
  const found = await resolvePath(root, path, false)
  return found ? readFile(found.dir, found.name) : null
}

/**
 * 相対パスを指定してファイルを書く。途中のフォルダは作る。
 *
 * @param root 起点のフォルダ
 * @param path root からの相対パス
 * @param data 書き込む中身
 */
async function writeAt(root: Directory, path: string, data: Blob | string): Promise<void> {
  const target = await resolvePath(root, path, true)
  if (!target) throw new Error(`${path} を作成できませんでした`)
  await writeFile(target.dir, target.name, data)
}

/**
 * フォルダ配下のファイルを再帰的に列挙する。
 *
 * @param dir    対象のフォルダ
 * @param prefix 返すパスに付ける接頭辞。呼び出し側からは省略する
 * @returns dir からの相対パス
 */
async function listFilePaths(dir: Directory, prefix = ''): Promise<string[]> {
  const paths: string[] = []
  for (const entry of await listEntries(dir)) {
    if (entry.kind === 'file') {
      paths.push(prefix + entry.name)
      continue
    }
    const child = await getSubDirectory(dir, entry.name, false)
    if (child) paths.push(...(await listFilePaths(child, `${prefix}${entry.name}/`)))
  }
  return paths
}

/**
 * ファイルが残っていない子フォルダを消す。
 * フォルダ名を変えると前の名前のフォルダが空のまま残るため、保存のたびに掃除する。
 *
 * @param dir 対象のフォルダ
 */
async function pruneEmptyDirectories(dir: Directory): Promise<void> {
  for (const entry of await listEntries(dir)) {
    if (entry.kind !== 'directory') continue
    const child = await getSubDirectory(dir, entry.name, false)
    if (!child) continue
    await pruneEmptyDirectories(child)
    if ((await listEntries(child)).length === 0) await removeEntry(dir, entry.name)
  }
}

/**
 * assets/ に実際にあるファイルを、素材 id から引ける形にする。
 * project.json に書かれたパスで読めなかったときの拾い直しに使う
 * （フォルダの名前が変わっていても、ファイル名の id で元の素材に結び付く）。
 *
 * @param assetsDir assets/ のフォルダ。無ければ空の Map を返す
 */
async function indexAssetFiles(assetsDir: Directory | null): Promise<Map<string, string>> {
  const byId = new Map<string, string>()
  if (!assetsDir) return byId
  for (const path of await listFilePaths(assetsDir)) byId.set(assetIdFromPath(path), path)
  return byId
}

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
  const byId = await indexAssetFiles(assetsDir)

  const blobs = new Map<string, Blob>()
  for (const asset of parsed.assets ?? []) {
    const recorded = asset.file ? await readAt(dir, asset.file) : null
    // 書かれていたパスで読めなければ、同じ id のファイルを assets/ の中から拾い直す
    const fallbackPath = byId.get(asset.meta.id)
    const entry =
      recorded ?? (assetsDir && fallbackPath ? await readAt(assetsDir, fallbackPath) : null)
    if (entry) blobs.set(asset.meta.id, entry)
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

  /** assets/<...> から assets/ を除いた、assets/ の中での相対パス */
  const relative = (path: string) => path.slice(ASSETS_DIR.length + 1)

  // 素材フォルダぶんの階層があるので、assets/ 配下を丸ごと見て増減を出す
  const byId = await indexAssetFiles(assetsDir)
  const existing = new Set(byId.values())
  const wanted = new Set(payloads.map(({ path }) => relative(path)))

  for (const { blob, path } of payloads) {
    // 画像の中身は id に紐づいて変わらないので、同じ場所に既にあるなら書き直さない
    if (existing.has(relative(path))) continue
    await writeAt(dir, path, blob)
  }

  /*
   * 実体を取り出せなかった素材は、フォルダ側のファイルが最後の1つかもしれない。
   * 消さず、参照も残して次回の読み込みで拾えるようにする
   * （消してしまうと、確かめられないものを失わせることになる）。
   */
  const written = new Set(payloads.map(({ meta }) => meta.id))
  const surviving = useEditorStore
    .getState()
    .assets.filter((meta) => !written.has(meta.id) && byId.has(meta.id))
    .map((meta) => ({ meta, path: `${ASSETS_DIR}/${byId.get(meta.id) as string}` }))
  const kept = new Set(surviving.map(({ path }) => relative(path)))

  for (const path of existing) {
    if (wanted.has(path) || kept.has(path)) continue
    const found = await resolvePath(assetsDir, path, false)
    if (found) await removeEntry(found.dir, found.name)
  }
  await pruneEmptyDirectories(assetsDir)

  const project = buildProjectFile([...payloads, ...surviving])
  await writeFile(dir, PROJECT_JSON, JSON.stringify(project, null, 2))
  useEditorStore.getState().markWorkspaceSaved()
}

/** 中身のあるフォルダを開くときの確認。読み込んでよければ true を返す */
export type ConfirmOverwrite = (folderName: string) => boolean

/**
 * フォルダを接続する。中身があれば読み込み、空なら現在の内容をそこに書き出す。
 * 「保存」を未接続の状態で押したときもここに来る（保存先を聞かれる形になる）。
 *
 * @param confirmOverwrite 中身のあるフォルダだったときに呼ぶ確認。
 *                         ブラウザのダイアログを層の奥に埋めないよう、呼び出し側から渡す
 * @returns 接続できたか。ダイアログのキャンセルや確認の取り消しでは false
 */
export async function openProjectFolder(confirmOverwrite: ConfirmOverwrite): Promise<boolean> {
  const dir = await pickDirectory()
  if (!dir) return false
  if (!(await verifyPermission(dir, true)))
    throw new Error('フォルダへの書き込みが許可されませんでした')

  const hasProject = (await readFile(dir, PROJECT_JSON)) !== null
  if (hasProject) {
    if (!confirmOverwrite(dir.name)) return false
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
 *
 * @param confirmOverwrite 未接続で、選んだフォルダに中身があったときの確認
 */
export async function saveProjectFolder(confirmOverwrite: ConfirmOverwrite) {
  const dir = getCurrentDirectory()
  if (!dir) {
    await openProjectFolder(confirmOverwrite)
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
