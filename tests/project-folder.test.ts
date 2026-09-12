import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/storage/fsAccess', () => import('./helpers/fakeFs'))
vi.mock('@/core/storage/assetRepo', () => import('./helpers/fakeAssetRepo'))

import { fake, makeDir, resetFake, type FakeDir } from './helpers/fakeFs'
import { blobs, resetAssets, seedAsset } from './helpers/fakeAssetRepo'
import {
  disconnectProjectFolder,
  openProjectFolder,
  reconnectProjectFolder,
  restoreProjectFolder,
  saveProjectFolder,
} from '@/services/projectFolder'
import { useEditorStore } from '@/core/store'
import { DEFAULT_BACKGROUND, type AssetMeta } from '@/core/model/types'

const meta = (id: string): AssetMeta => ({
  id,
  name: `${id}.png`,
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
})

/** 素材をストアと（実体を持つ）リポジトリの両方に積む */
function seed(ids: string[]) {
  useEditorStore.setState({ assets: ids.map(meta) })
  for (const id of ids) seedAsset(id, new Blob([id]))
}

const assetsOf = (dir: FakeDir) => [...(dir.dirs.get('assets')?.files.keys() ?? [])].sort()

const projectOf = async (dir: FakeDir) =>
  JSON.parse(await (dir.files.get('project.json') as Blob).text())

/** window.confirm を使う経路のためのスタブ。answer が確認ダイアログの結果になる */
function stubConfirm(answer: boolean) {
  vi.stubGlobal('window', { confirm: () => answer })
}

beforeEach(() => {
  resetFake()
  resetAssets()
  vi.unstubAllGlobals()
  useEditorStore.setState({
    folders: [],
    thumbnails: [
      {
        id: 'th1',
        name: 'サムネイル 1',
        folderId: null,
        canvas: { width: 1920, height: 1080 },
        background: DEFAULT_BACKGROUND,
        layers: [],
      },
    ],
    currentThumbnailId: 'th1',
    assets: [],
    workspaceStatus: 'none',
    workspaceFolderName: null,
    workspaceDirty: true,
    missingFontLabels: [],
  })
})

describe('openProjectFolder', () => {
  it('空のフォルダを選ぶと、現在の内容をそこに書き出して接続する', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])

    expect(await openProjectFolder()).toBe(true)

    const state = useEditorStore.getState()
    expect(state.workspaceStatus).toBe('connected')
    expect(state.workspaceFolderName).toBe('work')
    expect(state.workspaceDirty).toBe(false)
    expect(assetsOf(dir)).toEqual(['a1.png'])
    expect((await projectOf(dir)).assets[0].file).toBe('assets/a1.png')
  })

  it('ダイアログをキャンセルすると何も変えない', async () => {
    fake.picked = null
    expect(await openProjectFolder()).toBe(false)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
  })

  it('中身のあるフォルダは、確認を断れば接続も読み込みもしない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    stubConfirm(true)
    await openProjectFolder()

    useEditorStore.setState({ thumbnails: [], assets: [] })
    fake.current = null
    stubConfirm(false)

    expect(await openProjectFolder()).toBe(false)
    expect(useEditorStore.getState().thumbnails).toEqual([])
  })

  it('確認に同意すると、フォルダの内容で置き換える', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    stubConfirm(true)
    await openProjectFolder()

    useEditorStore.setState({ thumbnails: [], assets: [] })
    fake.current = null
    await openProjectFolder()

    const state = useEditorStore.getState()
    expect(state.thumbnails.map((t) => t.id)).toEqual(['th1'])
    expect(state.assets.map((a) => a.id)).toEqual(['a1'])
    expect(blobs.has('a1')).toBe(true)
  })
})

describe('saveProjectFolder', () => {
  it('未接続なら保存先を聞く', async () => {
    fake.picked = makeDir('work')
    await saveProjectFolder()
    expect(useEditorStore.getState().workspaceFolderName).toBe('work')
  })

  it('接続済みならダイアログ無しでそのフォルダへ書く', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    await openProjectFolder()

    // 再びピッカーが出たら（＝未接続扱いなら）保存先を見失うようにしておく
    fake.picked = null
    useEditorStore.getState().setWorkspaceDirty(true)
    await saveProjectFolder()

    expect(useEditorStore.getState().workspaceDirty).toBe(false)
    expect(dir.files.has('project.json')).toBe(true)
  })

  it('増えた素材だけを書き、消えた素材のファイルは削除する', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await openProjectFolder()

    seed(['a1', 'a2'])
    fake.writeLog = []
    await saveProjectFolder()
    expect(assetsOf(dir)).toEqual(['a1.png', 'a2.png'])
    expect(fake.writeLog).toEqual(['assets/a2.png', 'project.json'])

    seed(['a2'])
    fake.writeLog = []
    await saveProjectFolder()
    expect(assetsOf(dir)).toEqual(['a2.png'])
    expect(fake.writeLog).toEqual(['project.json'])
  })

  it('素材が変わらなければ画像を書き直さない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await openProjectFolder()

    fake.writeLog = []
    await saveProjectFolder()
    expect(fake.writeLog).toEqual(['project.json'])
  })

  it('権限を失っていたら再接続待ちにして投げる', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    await openProjectFolder()

    fake.permission = false
    fake.grantOnRequest = false
    await expect(saveProjectFolder()).rejects.toThrow()
    expect(useEditorStore.getState().workspaceStatus).toBe('needs-permission')
  })
})

describe('restoreProjectFolder', () => {
  it('権限が残っていれば、フォルダの内容で IndexedDB 側の内容を上書きする', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await openProjectFolder()

    // リロード相当。ストアには IndexedDB から復元された古い内容が載っているとする
    useEditorStore.setState({
      thumbnails: [
        {
          id: 'stale',
          name: '古い',
          folderId: null,
          canvas: { width: 800, height: 600 },
          background: DEFAULT_BACKGROUND,
          layers: [],
        },
      ],
      currentThumbnailId: 'stale',
      assets: [],
      workspaceStatus: 'none',
    })
    fake.current = null

    expect(await restoreProjectFolder()).toBe(true)
    const state = useEditorStore.getState()
    expect(state.thumbnails.map((t) => t.id)).toEqual(['th1'])
    expect(state.workspaceStatus).toBe('connected')
    expect(state.workspaceDirty).toBe(false)
  })

  it('権限が切れていたら再接続待ちにして、内容には触らない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    await openProjectFolder()

    useEditorStore.setState({ workspaceStatus: 'none' })
    fake.current = null
    fake.permission = false

    expect(await restoreProjectFolder()).toBe(false)
    const state = useEditorStore.getState()
    expect(state.workspaceStatus).toBe('needs-permission')
    expect(state.workspaceFolderName).toBe('work')
  })

  it('非対応ブラウザでは何もしない', async () => {
    fake.supported = false
    fake.stored = makeDir('work')
    expect(await restoreProjectFolder()).toBe(false)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
  })

  it('覚えているフォルダが無ければ何もしない', async () => {
    expect(await restoreProjectFolder()).toBe(false)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
  })
})

describe('reconnectProjectFolder', () => {
  it('許可されれば接続に戻す', async () => {
    fake.picked = makeDir('work')
    await openProjectFolder()
    fake.current = null
    fake.permission = false
    await restoreProjectFolder()

    fake.grantOnRequest = true
    await reconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('connected')
  })

  it('拒否されたら再接続待ちのまま', async () => {
    fake.picked = makeDir('work')
    await openProjectFolder()
    fake.current = null
    fake.permission = false
    await restoreProjectFolder()

    fake.grantOnRequest = false
    await reconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('needs-permission')
  })
})

describe('disconnectProjectFolder', () => {
  it('接続を切って、次の起動で復元しないようにする', async () => {
    fake.picked = makeDir('work')
    await openProjectFolder()

    await disconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
    expect(fake.stored).toBeNull()
    expect(await restoreProjectFolder()).toBe(false)
  })
})
