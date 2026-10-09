import { t } from '@/shared/lib/i18n'
import { del, get, set } from 'idb-keyval'
import { createId } from '@/domain/id'
import { kv } from './db'

const HANDLE_KEY = 'handle:workspace'
const RECENT_KEY = 'handle:recent'
/** 履歴に残す件数。メニューに並べて選べる程度に抑える */
const RECENT_LIMIT = 10

/**
 * File System Access API のうち、TypeScript の lib.dom に含まれていない部分。
 * 型定義パッケージを増やさずに済ませるため、使う分だけここで宣言する
 * （fontRepo.ts の queryLocalFonts と同じ方針）。
 */
type PermissionOptions = { mode: 'read' | 'readwrite' }
type DirectoryHandle = FileSystemDirectoryHandle & {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
  queryPermission: (options: PermissionOptions) => Promise<PermissionState>
  requestPermission: (options: PermissionOptions) => Promise<PermissionState>
  isSameEntry: (other: FileSystemHandle) => Promise<boolean>
}

type WindowWithPicker = Window & {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite'
    id?: string
    startIn?: string
  }) => Promise<DirectoryHandle>
}

/** 接続中のフォルダ。JSON 化できないので store には入れず、ここで持つ */
let current: DirectoryHandle | null = null

/** フォルダ連携の UI を出してよいか。非対応ブラウザ(Firefox / Safari)では出さない */
export function canUseFileSystemAccess(): boolean {
  return typeof (window as WindowWithPicker).showDirectoryPicker === 'function'
}

/** 接続中のフォルダ。未接続なら null */
export function getCurrentDirectory(): DirectoryHandle | null {
  return current
}

/**
 * 接続中のフォルダを差し替える。
 *
 * @param handle 接続するフォルダ。null で切断する
 */
export function setCurrentDirectory(handle: DirectoryHandle | null): void {
  current = handle
}

/**
 * フォルダ選択ダイアログを出す。
 * id を渡すと、次に開くときも前回と同じ場所から始まる。
 *
 * @returns 選ばれたフォルダ。キャンセルされた場合は null（失敗ではないので投げない）
 */
export async function pickDirectory(): Promise<DirectoryHandle | null> {
  const picker = (window as WindowWithPicker).showDirectoryPicker
  if (!picker) throw new Error(t('このブラウザはフォルダの読み書きに対応していません'))
  try {
    // Window のメソッドは呼び出し元を失うと Illegal invocation になるため、window を渡す。
    return await picker.call(window, {
      mode: 'readwrite',
      id: 'thumbpon-workspace',
      startIn: 'documents',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

/**
 * 書き込み権限があるか調べる。
 *
 * @param handle  対象のフォルダ
 * @param request true のときだけ権限を要求する。要求はユーザー操作の中からしか通らないため、
 *                起動時の自動復元では false で呼ぶこと
 */
export async function verifyPermission(
  handle: DirectoryHandle,
  request: boolean,
): Promise<boolean> {
  const options: PermissionOptions = { mode: 'readwrite' }
  if ((await handle.queryPermission(options)) === 'granted') return true
  if (!request) return false
  return (await handle.requestPermission(options)) === 'granted'
}

/**
 * 次回の起動で繋ぎ直せるようにフォルダを覚えておく。
 * ハンドルは structured clone できるので IndexedDB にそのまま入る。
 *
 * @param handle 覚えるフォルダ
 */
export async function saveHandle(handle: DirectoryHandle): Promise<void> {
  await set(HANDLE_KEY, handle, kv)
}

/** 前回接続していたフォルダ。無ければ null。権限が残っているかは別途確認すること */
export async function loadHandle(): Promise<DirectoryHandle | null> {
  return (await get<DirectoryHandle>(HANDLE_KEY, kv)) ?? null
}

/** 覚えているフォルダを忘れる */
export async function clearHandle(): Promise<void> {
  await del(HANDLE_KEY, kv)
}

/**
 * 子フォルダを得る。
 *
 * @param parent 親フォルダ
 * @param name   子フォルダ名
 * @param create 無いときに作るか。false で無ければ null を返す
 */
export async function getSubDirectory(
  parent: DirectoryHandle,
  name: string,
  create: boolean,
): Promise<DirectoryHandle | null> {
  try {
    return (await parent.getDirectoryHandle(name, { create })) as DirectoryHandle
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null
    throw error
  }
}

/**
 * ファイルを読む。
 *
 * @param dir  読み込み元のフォルダ
 * @param name ファイル名
 * @returns 無ければ null
 */
export async function readFile(dir: DirectoryHandle, name: string): Promise<File | null> {
  try {
    return await (await dir.getFileHandle(name)).getFile()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null
    throw error
  }
}

/**
 * ファイルを書く。既にあれば丸ごと置き換える。
 *
 * @param dir  書き込み先のフォルダ
 * @param name ファイル名
 * @param data 書き込む中身
 */
export async function writeFile(
  dir: DirectoryHandle,
  name: string,
  data: Blob | string,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(data)
  } finally {
    await writable.close()
  }
}

/** フォルダ直下の1項目。ファイルとフォルダを見分けるために kind を持つ */
export type DirectoryEntry = { name: string; kind: 'file' | 'directory' }

/**
 * フォルダ直下の項目を列挙する。保存時に「既にあるもの」を知るために使う。
 * 素材はフォルダ分けされるので、ファイルと子フォルダを見分けられる形で返す。
 *
 * @param dir 対象のフォルダ
 */
export async function listEntries(dir: DirectoryHandle): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = []
  for await (const [name, handle] of dir.entries()) {
    entries.push({ name, kind: handle.kind === 'directory' ? 'directory' : 'file' })
  }
  return entries
}

/**
 * ファイルかフォルダを消す。無い場合は何もしない。
 *
 * @param dir       対象のフォルダ
 * @param name      消す項目の名前
 * @param recursive フォルダを中身ごと消すか。false のとき、空でないフォルダは消せない
 */
export async function removeEntry(
  dir: DirectoryHandle,
  name: string,
  recursive = false,
): Promise<void> {
  try {
    await dir.removeEntry(name, { recursive })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return
    throw error
  }
}

/** 最近使ったプロジェクトのうち、store に載せられる部分。ハンドルは含めない */
export type RecentProject = {
  id: string
  folderName: string
  /** 開いたときのマニフェスト名。同じフォルダに複数あっても同じものを開き直すため。未確認なら空文字 */
  manifestName: string
  openedAt: number
}

type RecentEntry = RecentProject & { handle: DirectoryHandle }

/** ハンドルを除いて、画面に出せる形にする */
const toRecentProject = ({ handle: _handle, ...project }: RecentEntry): RecentProject => project

async function loadRecentEntries(): Promise<RecentEntry[]> {
  return (await get<RecentEntry[]>(RECENT_KEY, kv)) ?? []
}

/** 最近使ったプロジェクトを新しい順に返す */
export async function loadRecentProjects(): Promise<RecentProject[]> {
  return (await loadRecentEntries()).map(toRecentProject)
}

/**
 * 最近使ったプロジェクトのハンドルを得る。
 *
 * @param id 履歴の id
 * @returns 履歴に無ければ null
 */
export async function loadRecentHandle(
  id: string,
): Promise<{ handle: DirectoryHandle; manifestName: string } | null> {
  const found = (await loadRecentEntries()).find((entry) => entry.id === id)
  return found ? { handle: found.handle, manifestName: found.manifestName } : null
}

/**
 * 開いたフォルダを履歴の先頭に記録する。
 * 同じフォルダは名前ではなく isSameEntry で見分ける（別の場所の同名フォルダを潰さないため）。
 *
 * @param handle       開いたフォルダ
 * @param manifestName 開いたマニフェストのファイル名
 * @returns 記録後の履歴
 */
export async function rememberRecentProject(
  handle: DirectoryHandle,
  manifestName: string,
): Promise<RecentProject[]> {
  const entries = await loadRecentEntries()
  const others: RecentEntry[] = []
  let id: string | null = null
  for (const entry of entries) {
    if (id === null && (await handle.isSameEntry(entry.handle))) id = entry.id
    else others.push(entry)
  }
  const next = [
    { id: id ?? createId(), folderName: handle.name, manifestName, openedAt: Date.now(), handle },
    ...others,
  ].slice(0, RECENT_LIMIT)
  await set(RECENT_KEY, next, kv)
  return next.map(toRecentProject)
}

/**
 * 履歴から外す。フォルダが移動・削除されて開けなくなったときに使う。
 *
 * @param id 履歴の id
 * @returns 外した後の履歴
 */
export async function forgetRecentProject(id: string): Promise<RecentProject[]> {
  const next = (await loadRecentEntries()).filter((entry) => entry.id !== id)
  await set(RECENT_KEY, next, kv)
  return next.map(toRecentProject)
}

/**
 * ブラウザに保存領域の永続化を求める。
 * 認められないと、容量が逼迫したときに履歴や作業内容が自動で消されることがある。
 * 認められなくても動作は変わらないので、結果は見ない。
 */
export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
  if (await navigator.storage.persisted()) return
  await navigator.storage.persist()
}
