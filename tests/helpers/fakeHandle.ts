/**
 * File System Access API の handle を、メモリ上に作ったもの。
 *
 * `fakeFs.ts` は fsAccess.ts をまるごと置き換えるので、fsAccess.ts 自身（階層の作成・
 * 列挙・削除）は検証できない。こちらはブラウザが渡してくる handle の側を模すので、
 * fsAccess.ts を本物のまま通せる。
 *
 * 本物に合わせて、無いものは NotFoundError、種別違いは TypeMismatchError を投げる。
 */

/** ファイル。中身は Blob のまま持つ */
export class FakeFileHandle {
  readonly kind = 'file' as const

  constructor(
    public name: string,
    public blob: Blob = new Blob(),
  ) {}

  async getFile(): Promise<File> {
    return new File([this.blob], this.name)
  }

  async createWritable() {
    // 既定では既存の中身を捨てる（keepExistingData を渡さない本物と同じ）
    const chunks: (Blob | string)[] = []
    return {
      write: async (data: Blob | string) => {
        chunks.push(data)
      },
      close: async () => {
        this.blob = new Blob(chunks)
      },
    }
  }
}

/** フォルダ。子は名前で引ける */
export class FakeDirHandle {
  readonly kind = 'directory' as const
  readonly children = new Map<string, FakeFileHandle | FakeDirHandle>()

  constructor(public name: string) {}

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FakeFileHandle> {
    const found = this.children.get(name)
    if (found) {
      if (found.kind !== 'file') throw new DOMException(name, 'TypeMismatchError')
      return found
    }
    if (!options?.create) throw new DOMException(name, 'NotFoundError')
    const created = new FakeFileHandle(name)
    this.children.set(name, created)
    return created
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FakeDirHandle> {
    const found = this.children.get(name)
    if (found) {
      if (found.kind !== 'directory') throw new DOMException(name, 'TypeMismatchError')
      return found
    }
    if (!options?.create) throw new DOMException(name, 'NotFoundError')
    const created = new FakeDirHandle(name)
    this.children.set(name, created)
    return created
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    const found = this.children.get(name)
    if (!found) throw new DOMException(name, 'NotFoundError')
    if (found.kind === 'directory' && found.children.size > 0 && !options?.recursive) {
      throw new DOMException(name, 'InvalidModificationError')
    }
    this.children.delete(name)
  }

  async *entries(): AsyncIterableIterator<[string, FakeFileHandle | FakeDirHandle]> {
    for (const entry of [...this.children]) yield entry
  }

  async *keys(): AsyncIterableIterator<string> {
    for (const name of [...this.children.keys()]) yield name
  }

  async queryPermission() {
    return permission.state
  }

  async requestPermission() {
    permission.state = permission.grantOnRequest ? 'granted' : 'denied'
    return permission.state
  }
}

/** 権限の状態。テストから差し替えて、再接続待ちの経路も再現できる */
export const permission = {
  state: 'granted' as PermissionState,
  grantOnRequest: true,
}

/**
 * 空のフォルダを作る。
 *
 * @param name フォルダ名
 */
export function makeHandle(name: string): FakeDirHandle {
  return new FakeDirHandle(name)
}

/**
 * フォルダ配下のファイルを、パスと中身の組で見る。テストの検証用。
 *
 * @param dir    対象のフォルダ
 * @param prefix 付ける接頭辞。呼び出し側からは省略する
 */
export async function dumpFiles(dir: FakeDirHandle, prefix = ''): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [name, entry] of dir.children) {
    if (entry.kind === 'file') out[prefix + name] = await entry.blob.text()
    else Object.assign(out, await dumpFiles(entry, `${prefix}${name}/`))
  }
  return out
}

/**
 * パスの終端が属するフォルダと名前を返す。フォルダを外から触る操作を組み立てるのに使う。
 *
 * @param root 起点のフォルダ
 * @param path root からの相対パス
 */
function resolveEntry(root: FakeDirHandle, path: string): { dir: FakeDirHandle; name: string } {
  const segments = path.split('/')
  const name = segments.pop() as string
  let dir = root
  for (const segment of segments) {
    const child = dir.children.get(segment)
    if (!child || child.kind !== 'directory') throw new Error(`${path} が見つかりません`)
    dir = child
  }
  if (!dir.children.has(name)) throw new Error(`${path} が見つかりません`)
  return { dir, name }
}

/**
 * ファイルやフォルダの名前を、アプリの外（OS や手作業）から変えられた状況を作る。
 *
 * @param root    起点のフォルダ
 * @param path    変える対象の相対パス
 * @param renamed 新しい名前
 */
export function renameEntry(root: FakeDirHandle, path: string, renamed: string): void {
  const { dir, name } = resolveEntry(root, path)
  const entry = dir.children.get(name) as FakeFileHandle | FakeDirHandle
  dir.children.delete(name)
  entry.name = renamed
  dir.children.set(renamed, entry)
}

/**
 * ファイルやフォルダを、アプリの外から消された状況を作る。
 *
 * @param root 起点のフォルダ
 * @param path 消す対象の相対パス
 */
export function deleteEntry(root: FakeDirHandle, path: string): void {
  const { dir, name } = resolveEntry(root, path)
  dir.children.delete(name)
}

/**
 * showDirectoryPicker を持つ window を用意する。
 * fsAccess.ts は window を直接見るので、import より先に呼ぶこと。
 *
 * @param pick ピッカーで返すフォルダを決める関数。null でキャンセルを表す
 */
export function installPicker(pick: () => FakeDirHandle | null) {
  const target = globalThis as unknown as { window?: unknown }
  target.window = {
    showDirectoryPicker: async () => {
      const picked = pick()
      if (!picked) throw new DOMException('abort', 'AbortError')
      return picked
    },
  }
}
