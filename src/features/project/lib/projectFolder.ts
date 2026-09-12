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
import {
  ASSETS_DIR,
  assetIdFromPath,
  defaultManifestName,
  findManifestName,
} from '@/domain/project'
import { useEditorStore } from '@/app/store'
import {
  applyProjectFile,
  buildProjectFile,
  collectAssetPayloads,
  isProjectFile,
} from './projectData'

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
 * フォルダ直下のファイル名。マニフェストを探すのに使う。
 *
 * @param dir 対象のフォルダ
 */
async function listFileNames(dir: Directory): Promise<string[]> {
  return (await listEntries(dir)).filter((entry) => entry.kind === 'file').map(({ name }) => name)
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
 * マニフェストに書かれたパスで読めなかったときの拾い直しに使う
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
 * 書き込み先のマニフェスト名を決める。
 * 覚えている名前を最優先にするのは、同じフォルダに複数あるときに
 * 開いたのとは別のプロジェクトを上書きしないため。
 *
 * @param dir        対象のフォルダ
 * @param remembered 正本として覚えている名前。無ければ null
 * @returns 既にあるものを優先し、1つも無ければフォルダ名から作る
 */
async function resolveManifestName(dir: Directory, remembered: string | null): Promise<string> {
  const names = await listFileNames(dir)
  if (remembered && names.includes(remembered)) return remembered
  return findManifestName(names) ?? defaultManifestName(dir.name)
}

/**
 * フォルダの内容を読み込んで現在の状態を置き換える。
 *
 * @param dir       読み込み元のワークスペースフォルダ
 * @param preferred 開くと決まっているマニフェスト名。探索より優先する
 * @returns 読み込んだマニフェストの名前。1つも無ければ null（空のフォルダを選んだ場合）
 */
async function loadFrom(dir: Directory, preferred?: string): Promise<string | null> {
  const names = await listFileNames(dir)
  const manifest = preferred && names.includes(preferred) ? preferred : findManifestName(names)
  if (!manifest) return null

  const file = await readFile(dir, manifest)
  if (!file) return null

  const parsed: unknown = JSON.parse(await file.text())
  if (!isProjectFile(parsed)) throw new Error(`${manifest} がサムネぽんの形式ではありません`)

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
  return manifest
}

/**
 * 現在の状態をフォルダに書き出す。
 * 素材は既にあるファイルを書き直さず、増減分だけを反映する。
 *
 * @param dir      書き込み先のワークスペースフォルダ
 * @param manifest 書き込むマニフェストのファイル名
 */
async function saveTo(dir: Directory, manifest: string) {
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
  await writeFile(dir, manifest, JSON.stringify(project, null, 2))
  const store = useEditorStore.getState()
  store.setWorkspace('connected', dir.name, manifest)
  store.markWorkspaceSaved()
}

/** 保存先に別のプロジェクトがあったときの確認。今の内容で上書きしてよければ true を返す */
export type ConfirmOverwrite = (folderName: string) => boolean

/**
 * 保存先のフォルダを選んで接続し、現在の内容をそこに書き出す。
 * 「保存」を未接続の状態で押したときの経路。
 *
 * **選んだフォルダは読み込まない。** 保存を押したのに今の作業が捨てられるのを防ぐため、
 * 既に別のプロジェクトがあっても、確認のうえ現在の内容で置き換える
 * （読み込みたいときは「プロジェクトを開く」を使う）。
 *
 * @param confirmOverwrite 別のプロジェクトが入っていたときに呼ぶ確認。
 *                         ブラウザのダイアログを層の奥に埋めないよう、呼び出し側から渡す
 * @returns 保存できたか。ダイアログのキャンセルや確認の取り消しでは false
 */
async function chooseWorkspaceFolder(confirmOverwrite: ConfirmOverwrite): Promise<boolean> {
  const dir = await pickDirectory()
  if (!dir) return false
  if (!(await verifyPermission(dir, true)))
    throw new Error('フォルダへの書き込みが許可されませんでした')

  const existing = findManifestName(await listFileNames(dir))
  if (existing && !confirmOverwrite(dir.name)) return false

  setCurrentDirectory(dir)
  await saveHandle(dir)
  // 既にある名前を引き継ぐ。付け直すと同じフォルダにマニフェストが2つ並んでしまう
  await saveTo(dir, existing ?? defaultManifestName(dir.name))
  return true
}

/**
 * プロジェクトのフォルダを開いて、現在の内容を置き換える。
 *
 * 素材はマニフェストの隣の `assets/` に別ファイルで置かれているので、
 * ファイルではなくフォルダごと選んでもらう（ファイルのハンドルからは親フォルダを辿れないため、
 * ファイル選択にすると素材の許可をもらう2つ目のダイアログが必要になってしまう）。
 *
 * サムネぽんのプロジェクトが無いフォルダは受け付けない。「開く」で新しい作業場所まで
 * 作れてしまうと「保存」との役割が混ざるため（新しい保存先は「保存」から選ぶ）。
 *
 * @returns 開いたか。ダイアログのキャンセルでは false
 */
export async function openProjectFolder(): Promise<boolean> {
  const dir = await pickDirectory()
  if (!dir) return false
  if (!(await verifyPermission(dir, true)))
    throw new Error('フォルダへの書き込みが許可されませんでした')

  const manifest = findManifestName(await listFileNames(dir))
  if (!manifest) throw new Error(`「${dir.name}」にサムネぽんのプロジェクトがありません`)

  setCurrentDirectory(dir)
  await saveHandle(dir)
  await loadFrom(dir, manifest)
  const store = useEditorStore.getState()
  store.setWorkspace('connected', dir.name, manifest)
  store.markWorkspaceSaved()
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
  const manifest = await loadFrom(dir)
  const loaded = useEditorStore.getState()
  loaded.setWorkspace('connected', dir.name, manifest)
  loaded.markWorkspaceSaved()
  return manifest !== null
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
  const manifest = await loadFrom(dir)
  const store = useEditorStore.getState()
  store.setWorkspace('connected', dir.name, manifest)
  store.markWorkspaceSaved()
}

/**
 * 現在の内容をフォルダに保存する。
 * 未接続なら先に保存先のフォルダを選んでもらう。
 *
 * @param confirmOverwrite 未接続で、選んだフォルダに別のプロジェクトがあったときの確認
 */
export async function saveProjectFolder(confirmOverwrite: ConfirmOverwrite) {
  const dir = getCurrentDirectory()
  if (!dir) {
    await chooseWorkspaceFolder(confirmOverwrite)
    return
  }
  const { workspaceFileName } = useEditorStore.getState()
  if (!(await verifyPermission(dir, true))) {
    useEditorStore.getState().setWorkspace('needs-permission', dir.name, workspaceFileName)
    throw new Error('フォルダへの書き込みが許可されませんでした')
  }
  await saveTo(dir, await resolveManifestName(dir, workspaceFileName))
}

/** フォルダを切り離して、ブラウザ内(IndexedDB)だけの作業に戻す */
export async function disconnectProjectFolder() {
  setCurrentDirectory(null)
  await clearHandle()
  useEditorStore.getState().setWorkspace('none', null)
}
