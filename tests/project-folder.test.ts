import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/storage/fsAccess', () => import('./helpers/fakeFs'))
vi.mock('@/shared/lib/storage/assetRepo', () => import('./helpers/fakeAssetRepo'))

import { fake, makeDir, resetFake, type FakeDir } from './helpers/fakeFs'
import { blobs, resetAssets, seedAsset } from './helpers/fakeAssetRepo'
import {
  openProjectFolder,
  disconnectProjectFolder,
  reconnectProjectFolder,
  reloadProjectFolder,
  restoreProjectFolder,
  saveProjectFolder,
} from '@/features/project/lib/projectFolder'
import { useEditorStore } from '@/app/store'
import type { AssetMeta } from '@/domain/asset'
import { DEFAULT_BACKGROUND } from '@/domain/background'

const meta = (id: string, folderId: string | null = null): AssetMeta => ({
  id,
  name: `${id}.png`,
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
  folderId,
})

/** 素材をストアと（実体を持つ）リポジトリの両方に積む */
function seed(ids: string[]) {
  useEditorStore.setState({ assets: ids.map((id) => meta(id)) })
  for (const id of ids) seedAsset(id, new Blob([id]))
}

const assetsOf = (dir: FakeDir) => [...(dir.dirs.get('assets')?.files.keys() ?? [])].sort()

/** assets/ 配下のファイルを、素材フォルダぶんの階層を含めたパスで見る */
function assetPathsOf(dir: FakeDir): string[] {
  const walk = (target: FakeDir | undefined, prefix: string): string[] => {
    if (!target) return []
    return [
      ...[...target.files.keys()].map((name) => prefix + name),
      ...[...target.dirs].flatMap(([name, child]) => walk(child, `${prefix}${name}/`)),
    ]
  }
  return walk(dir.dirs.get('assets'), '').sort()
}

const projectOf = async (dir: FakeDir) =>
  JSON.parse(await (dir.files.get('work.thumbpon') as Blob).text())

/** 保存先に別のプロジェクトがあったときの確認。上書きする / しない */
const agree = () => true
const decline = () => false

beforeEach(() => {
  resetFake()
  resetAssets()
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
    assetFolders: [],
    workspaceStatus: 'none',
    workspaceFolderName: null,
    workspaceDirty: true,
    missingFontLabels: [],
  })
})

describe('保存先の選択', () => {
  it('空のフォルダを選ぶと、フォルダ名からマニフェストを作って接続する', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])

    await saveProjectFolder(agree)

    const state = useEditorStore.getState()
    expect(state.workspaceStatus).toBe('connected')
    expect(state.workspaceFolderName).toBe('work')
    expect(state.workspaceFileName).toBe('work.thumbpon')
    expect(state.workspaceDirty).toBe(false)
    expect(assetsOf(dir)).toEqual(['a1.png'])
    expect((await projectOf(dir)).assets[0].file).toBe('assets/a1.png')
  })

  it('ダイアログをキャンセルすると何も変えない', async () => {
    fake.picked = null
    await saveProjectFolder(agree)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
  })

  it('別のプロジェクトがあるフォルダは、確認を断れば何も書かない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    await disconnectProjectFolder()
    seed(['a2'])

    await saveProjectFolder(decline)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
    expect(assetsOf(dir)).toEqual(['a1.png'])
  })

  it('確認に同意すると、今の内容でフォルダを置き換える（読み込まない）', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    // 別プロジェクトで作業中に、同じフォルダを保存先に選び直した状況
    await disconnectProjectFolder()
    seed(['a2'])
    await saveProjectFolder(agree)

    // 保存を押して今の作業が捨てられてはいけない
    expect(useEditorStore.getState().assets.map((a) => a.id)).toEqual(['a2'])
    expect(assetsOf(dir)).toEqual(['a2.png'])
    // 名前を付け直すとマニフェストが2つ並ぶので、既にあるものを引き継ぐ
    expect([...dir.files.keys()]).toEqual(['work.thumbpon'])
  })
})

describe('openProjectFolder', () => {
  it('選ばれたフォルダを正本にして読み込む', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    useEditorStore.setState({ thumbnails: [], assets: [] })
    fake.current = null

    expect(await openProjectFolder()).toBe(true)

    const state = useEditorStore.getState()
    expect(state.workspaceStatus).toBe('connected')
    expect(state.workspaceFileName).toBe('work.thumbpon')
    expect(state.thumbnails.map((t) => t.id)).toEqual(['th1'])
    expect(state.assets.map((a) => a.id)).toEqual(['a1'])
    expect(blobs.has('a1')).toBe(true)
  })

  it('外からリネームされたマニフェストも開ける', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    const manifest = dir.files.get('work.thumbpon') as Blob
    dir.files.delete('work.thumbpon')
    dir.files.set('夜景シリーズ.thumbpon', manifest)
    fake.current = null

    expect(await openProjectFolder()).toBe(true)
    expect(useEditorStore.getState().workspaceFileName).toBe('夜景シリーズ.thumbpon')
  })

  it('プロジェクトが無いフォルダは受け付けない（新しい作業場所は「保存」から作る）', async () => {
    fake.picked = makeDir('empty')
    await expect(openProjectFolder()).rejects.toThrow('サムネぽんのプロジェクトがありません')
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
    expect(fake.current).toBeNull()
  })

  it('ダイアログをキャンセルすると false を返し、何も変えない', async () => {
    fake.picked = null
    expect(await openProjectFolder()).toBe(false)
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
  })
})

describe('saveProjectFolder', () => {
  it('未接続なら保存先を聞く', async () => {
    fake.picked = makeDir('work')
    await saveProjectFolder(agree)
    expect(useEditorStore.getState().workspaceFolderName).toBe('work')
  })

  it('接続済みならダイアログ無しでそのフォルダへ書く', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    await saveProjectFolder(agree)

    // 再びピッカーが出たら（＝未接続扱いなら）保存先を見失うようにしておく
    fake.picked = null
    useEditorStore.getState().setWorkspaceDirty(true)
    await saveProjectFolder(agree)

    expect(useEditorStore.getState().workspaceDirty).toBe(false)
    expect(dir.files.has('work.thumbpon')).toBe(true)
  })

  it('増えた素材だけを書き、消えた素材のファイルは削除する', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    seed(['a1', 'a2'])
    fake.writeLog = []
    await saveProjectFolder(agree)
    expect(assetsOf(dir)).toEqual(['a1.png', 'a2.png'])
    expect(fake.writeLog).toEqual(['assets/a2.png', 'work.thumbpon'])

    seed(['a2'])
    fake.writeLog = []
    await saveProjectFolder(agree)
    expect(assetsOf(dir)).toEqual(['a2.png'])
    expect(fake.writeLog).toEqual(['work.thumbpon'])
  })

  it('素材フォルダの名前でフォルダ分けして書く', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    useEditorStore.setState({
      assets: [meta('a1', 'f1'), meta('a2')],
      assetFolders: [{ id: 'f1', name: '風景', collapsed: false }],
    })
    seedAsset('a1', new Blob(['a1']))
    seedAsset('a2', new Blob(['a2']))

    await saveProjectFolder(agree)

    expect(assetPathsOf(dir)).toEqual(['a2.png', '風景/a1.png'])
    const project = await projectOf(dir)
    expect(project.assets.map((a: { file: string }) => a.file).sort()).toEqual([
      'assets/a2.png',
      'assets/風景/a1.png',
    ])
    expect(project.assetFolders).toEqual([{ id: 'f1', name: '風景', collapsed: false }])
  })

  it('フォルダ名を変えると素材を移し、空になったフォルダは残さない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    useEditorStore.setState({
      assets: [meta('a1', 'f1')],
      assetFolders: [{ id: 'f1', name: '風景', collapsed: false }],
    })
    seedAsset('a1', new Blob(['a1']))
    await saveProjectFolder(agree)

    await useEditorStore.getState().renameAssetFolder('f1', '人物')
    fake.writeLog = []
    await saveProjectFolder(agree)

    expect(assetPathsOf(dir)).toEqual(['人物/a1.png'])
    expect(fake.writeLog).toEqual(['人物/a1.png', 'work.thumbpon'])
    expect(dir.dirs.get('assets')?.dirs.has('風景')).toBe(false)
  })

  it('フォルダ分けしたまま読み込み直せる', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    useEditorStore.setState({
      assets: [meta('a1', 'f1')],
      assetFolders: [{ id: 'f1', name: '風景', collapsed: false }],
    })
    seedAsset('a1', new Blob(['a1']))
    await saveProjectFolder(agree)

    useEditorStore.setState({ assets: [], assetFolders: [] })
    fake.current = null
    await restoreProjectFolder()

    const state = useEditorStore.getState()
    expect(state.assetFolders.map((f) => f.name)).toEqual(['風景'])
    expect(state.assets[0].folderId).toBe('f1')
    expect(await (blobs.get('a1') as Blob).text()).toBe('a1')
  })

  it('素材が変わらなければ画像を書き直さない', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    fake.writeLog = []
    await saveProjectFolder(agree)
    expect(fake.writeLog).toEqual(['work.thumbpon'])
  })

  it('権限を失っていたら再接続待ちにして投げる', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    await saveProjectFolder(agree)

    fake.permission = false
    fake.grantOnRequest = false
    await expect(saveProjectFolder(agree)).rejects.toThrow()
    expect(useEditorStore.getState().workspaceStatus).toBe('needs-permission')
  })
})

describe('restoreProjectFolder', () => {
  it('権限が残っていれば、フォルダの内容で IndexedDB 側の内容を上書きする', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

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
    await saveProjectFolder(agree)

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
    await saveProjectFolder(agree)
    fake.current = null
    fake.permission = false
    await restoreProjectFolder()

    fake.grantOnRequest = true
    await reconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('connected')
  })

  it('拒否されたら再接続待ちのまま', async () => {
    fake.picked = makeDir('work')
    await saveProjectFolder(agree)
    fake.current = null
    fake.permission = false
    await restoreProjectFolder()

    fake.grantOnRequest = false
    await reconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('needs-permission')
  })
})

describe('reloadProjectFolder', () => {
  it('接続中のフォルダの内容で現在の編集を置き換える', async () => {
    const dir = makeDir('work')
    fake.picked = dir
    seed(['a1'])
    await saveProjectFolder(agree)

    useEditorStore.setState({ thumbnails: [], assets: [], workspaceDirty: true })

    expect(await reloadProjectFolder()).toBe(true)
    const state = useEditorStore.getState()
    expect(state.thumbnails.map((thumbnail) => thumbnail.id)).toEqual(['th1'])
    expect(state.assets.map((asset) => asset.id)).toEqual(['a1'])
    expect(state.workspaceDirty).toBe(false)
  })

  it('読み込み先が無ければ何もしない', async () => {
    expect(await reloadProjectFolder()).toBe(false)
  })
})

describe('disconnectProjectFolder', () => {
  it('接続を切って、次の起動で復元しないようにする', async () => {
    fake.picked = makeDir('work')
    await saveProjectFolder(agree)

    await disconnectProjectFolder()
    expect(useEditorStore.getState().workspaceStatus).toBe('none')
    expect(fake.stored).toBeNull()
    expect(await restoreProjectFolder()).toBe(false)
  })
})
