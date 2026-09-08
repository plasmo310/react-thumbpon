import { del, get, set } from 'idb-keyval'
import { kv } from './db'

const HANDLE_KEY = 'handle:workspace'

/**
 * File System Access API のうち、TypeScript の lib.dom に含まれていない部分。
 * 型定義パッケージを増やさずに済ませるため、使う分だけここで宣言する
 * （fontRepo.ts の queryLocalFonts と同じ方針）。
 */
type PermissionOptions = { mode: 'read' | 'readwrite' }
type DirectoryHandle = FileSystemDirectoryHandle & {
  keys: () => AsyncIterableIterator<string>
  queryPermission: (options: PermissionOptions) => Promise<PermissionState>
  requestPermission: (options: PermissionOptions) => Promise<PermissionState>
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
  if (!picker) throw new Error('このブラウザはフォルダの読み書きに対応していません')
  try {
    return await picker({ mode: 'readwrite', id: 'thumbpon-workspace', startIn: 'documents' })
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
export async function verifyPermission(handle: DirectoryHandle, request: boolean): Promise<boolean> {
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

/**
 * フォルダ直下の名前を列挙する。保存時に「既にあるファイル」を知るために使う。
 *
 * @param dir 対象のフォルダ
 */
export async function listNames(dir: DirectoryHandle): Promise<Set<string>> {
  const names = new Set<string>()
  for await (const name of dir.keys()) names.add(name)
  return names
}

/**
 * ファイルを消す。無い場合は何もしない。
 *
 * @param dir  対象のフォルダ
 * @param name 消すファイル名
 */
export async function removeFile(dir: DirectoryHandle, name: string): Promise<void> {
  try {
    await dir.removeEntry(name)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return
    throw error
  }
}
