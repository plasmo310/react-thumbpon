/**
 * src/core/storage/fsAccess.ts をメモリ上のフォルダに置き換えたもの。
 * File System Access API は Node では動かないので、テストではこれを vi.mock で差し込む。
 * 書き込みは writeLog に残るので、「変わっていない素材を書き直していない」ことも検証できる。
 */

export type FakeDir = {
  name: string
  files: Map<string, Blob>
  dirs: Map<string, FakeDir>
}

/**
 * 空のフォルダを作る。
 *
 * @param name フォルダ名。画面に出す名前としても使われる
 */
export function makeDir(name: string): FakeDir {
  return { name, files: new Map(), dirs: new Map() }
}

/** テストから差し替える可変状態 */
export const fake = {
  /** showDirectoryPicker が返すフォルダ。null でキャンセルを表す */
  picked: null as FakeDir | null,
  /** 前回接続していたフォルダとして復元されるもの */
  stored: null as FakeDir | null,
  /** 接続中のフォルダ */
  current: null as FakeDir | null,
  /** 権限を持っているか。false にすると再接続待ちの経路を再現できる */
  permission: true,
  /** 権限要求（ユーザー操作）が通るか */
  grantOnRequest: true,
  supported: true,
  /** writeFile が呼ばれたパス。'assets/x.png' の形で積む */
  writeLog: [] as string[],
}

/** すべての状態を初期化する。各テストの beforeEach で呼ぶ */
export function resetFake() {
  fake.picked = null
  fake.stored = null
  fake.current = null
  fake.permission = true
  fake.grantOnRequest = true
  fake.supported = true
  fake.writeLog = []
}

const asDir = (dir: unknown) => dir as FakeDir

export const canUseFileSystemAccess = () => fake.supported
export const getCurrentDirectory = () => fake.current
export const setCurrentDirectory = (dir: unknown) => {
  fake.current = dir === null ? null : asDir(dir)
}
export const pickDirectory = async () => fake.picked
export const verifyPermission = async (_dir: unknown, request: boolean) =>
  fake.permission || (request && fake.grantOnRequest)
export const saveHandle = async (dir: unknown) => {
  fake.stored = asDir(dir)
}
export const loadHandle = async () => fake.stored
export const clearHandle = async () => {
  fake.stored = null
}

export const getSubDirectory = async (parent: unknown, name: string, create: boolean) => {
  const dir = asDir(parent)
  const found = dir.dirs.get(name)
  if (found) return found
  if (!create) return null
  const created = makeDir(name)
  dir.dirs.set(name, created)
  return created
}

export const readFile = async (dir: unknown, name: string) => {
  const blob = asDir(dir).files.get(name)
  return blob ? new File([blob], name) : null
}

export const writeFile = async (dir: unknown, name: string, data: Blob | string) => {
  const target = asDir(dir)
  // 接続中のフォルダ直下は名前だけ、子フォルダの中は 'フォルダ名/ファイル名' で残す
  fake.writeLog.push(target === fake.current ? name : `${target.name}/${name}`)
  target.files.set(name, typeof data === 'string' ? new Blob([data]) : data)
}

export const listEntries = async (dir: unknown) => {
  const target = asDir(dir)
  return [
    ...[...target.files.keys()].map((name) => ({ name, kind: 'file' as const })),
    ...[...target.dirs.keys()].map((name) => ({ name, kind: 'directory' as const })),
  ]
}

export const removeEntry = async (dir: unknown, name: string) => {
  const target = asDir(dir)
  target.files.delete(name)
  target.dirs.delete(name)
}
