import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => import('./helpers/fakeKv'))

import {
  deleteEntry,
  dumpFiles,
  installPicker,
  makeHandle,
  permission,
  renameEntry,
} from './helpers/fakeHandle'
import { resetKv, store as kvStore } from './helpers/fakeKv'

/*
 * fsAccess.ts は import された時点で window を見るので、先にピッカーを差し込む。
 * ここでは fsAccess.ts を本物のまま通し、handle の側だけを偽物にする。
 */
let picked: ReturnType<typeof makeHandle> | null = null
installPicker(() => picked)

const { restoreWorkspace } = await import('@/features/project/lib/workspace')
const { openProjectFolder, saveProjectFolder, switchRecentProject } =
  await import('@/features/project/lib/projectFolder')
const { getAssetBlob } = await import('@/shared/lib/storage/assetRepo')
const { setCurrentDirectory } = await import('@/shared/lib/storage/fsAccess')
const { useEditorStore } = await import('@/app/store')
const { createThumbnail } = await import('@/domain/thumbnail')

type ImageSizeGlobals = {
  createImageBitmap: () => Promise<{ width: number; height: number; close: () => void }>
}
;(globalThis as unknown as ImageSizeGlobals).createImageBitmap = async () => ({
  width: 10,
  height: 10,
  close: () => {},
})
URL.createObjectURL = () => 'blob:fake'
URL.revokeObjectURL = () => {}

const state = () => useEditorStore.getState()

const image = (name: string) => new File([`bytes-of-${name}`], name, { type: 'image/png' })

/** リロード相当。保存されたもの（IndexedDB / フォルダ）だけを残して状態を初期値へ戻す */
function reload() {
  const thumbnail = createThumbnail('サムネイル 1')
  setCurrentDirectory(null)
  useEditorStore.setState({
    assets: [],
    assetFolders: [],
    folders: [],
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    selectedId: null,
    ready: false,
    workspaceStatus: 'none',
    workspaceFolderName: null,
    workspaceFileName: null,
    workspaceDirty: false,
    missingFontLabels: [],
    recentProjects: [],
  })
}

const agree = () => true

/** 素材1つをフォルダに入れた状態を作る。返り値は素材 id とフォルダ id */
async function withFolderedAsset(folderName?: string) {
  const [added] = await state().addAssetFiles([image('a.png')])
  await state().addAssetFolder()
  const folderId = state().assetFolders[0].id
  if (folderName) await state().renameAssetFolder(folderId, folderName)
  await state().moveAssetToFolder(added.id, folderId)
  state().addImageLayer(added.id)
  return { assetId: added.id, folderId }
}

beforeEach(() => {
  resetKv()
  permission.state = 'granted'
  permission.grantOnRequest = true
  picked = null
  reload()
})

describe('ワークスペースフォルダ（本物の fsAccess を通す）', () => {
  it('素材フォルダごと書き出し、開き直しても素材が残る', async () => {
    const { assetId, folderId } = await withFolderedAsset('風景')

    picked = makeHandle('work')
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      'assets/風景/' + assetId + '.png',
      'work.thumbpon',
    ])

    reload()
    await restoreWorkspace()

    expect(state().workspaceStatus).toBe('connected')
    expect(state().assetFolders.map((f) => f.name)).toEqual(['風景'])
    expect(state().assets.map((a) => a.folderId)).toEqual([folderId])
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
    expect(state().thumbnails[0].layers).toHaveLength(1)
  })

  it('フォルダ名を変えて保存し直しても素材が残り、空のフォルダは消える', async () => {
    const { assetId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    await state().renameAssetFolder(state().assetFolders[0].id, '人物')
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      'assets/人物/' + assetId + '.png',
      'work.thumbpon',
    ])

    reload()
    await restoreWorkspace()
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
  })

  it('マニフェストをアプリの外からリネームされても、2つ目を作らない', async () => {
    await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    // エクスプローラーでプロジェクトに名前を付け直した状況
    renameEntry(picked, 'work.thumbpon', '夜景シリーズ.thumbpon')

    reload()
    await restoreWorkspace()
    await saveProjectFolder(agree)

    const names = Object.keys(await dumpFiles(picked)).filter((n) => n.endsWith('.thumbpon'))
    expect(names).toEqual(['夜景シリーズ.thumbpon'])
    expect(state().workspaceFileName).toBe('夜景シリーズ.thumbpon')
  })

  it('フォルダ名をアプリの外から変えられても、id でファイルを拾い直す', async () => {
    const { assetId, folderId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    // OS や手作業でフォルダ名だけ変わった状況。マニフェストのパスとは合わなくなる
    renameEntry(picked, 'assets/風景', 'landscape')

    reload()
    await restoreWorkspace()

    expect(state().assets.map((a) => a.folderId)).toEqual([folderId])
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
  })

  it('フォルダ側のファイルが消えていても、ブラウザ内に残っていれば素材を落とさない', async () => {
    const { assetId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    deleteEntry(picked, `assets/風景/${assetId}.png`)

    // 素材の実体は IndexedDB 側にも残っているので、確かめられないだけで消してはいけない
    reload()
    await restoreWorkspace()

    expect(state().assets).toHaveLength(1)
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')

    // 次の保存でフォルダ側にも書き戻る
    await saveProjectFolder(agree)
    expect(Object.keys(await dumpFiles(picked))).toContain(`assets/風景/${assetId}.png`)
  })

  it('実体を取り出せない素材でも、フォルダ側のファイルは消さず参照も残す', async () => {
    const { assetId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    // ブラウザ内の実体だけを失った状況（フォルダ側のファイルが最後の1つ）
    kvStore.delete(`blob:${assetId}`)
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked))).toContain(`assets/風景/${assetId}.png`)
    const project = JSON.parse((await dumpFiles(picked))['work.thumbpon'])
    expect(project.assets.map((a: { file: string }) => a.file)).toEqual([
      `assets/風景/${assetId}.png`,
    ])

    // 次に開いたときフォルダ側から拾い直せる
    reload()
    await restoreWorkspace()
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
  })

  it('どこにも実体が無い素材は、名前で告知する（黙って消さない）', async () => {
    const { assetId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await saveProjectFolder(agree)

    // フォルダ側もブラウザ内も失った状況。復元できないので、理由が分かるようにする
    deleteEntry(picked, `assets/風景/${assetId}.png`)
    kvStore.delete(`blob:${assetId}`)

    reload()
    await restoreWorkspace()

    expect(state().missingAssetNames).toEqual(['a.png'])
    expect(state().assets).toEqual([])
  })

  it('未分類とフォルダ内が混ざっていても、それぞれの場所に書かれる', async () => {
    const { assetId } = await withFolderedAsset('風景')
    const [root] = await state().addAssetFiles([image('b.png')])

    picked = makeHandle('work')
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      `assets/${root.id}.png`,
      `assets/風景/${assetId}.png`,
      'work.thumbpon',
    ])

    reload()
    await restoreWorkspace()
    expect(state().assets).toHaveLength(2)
  })
})

describe('最近使ったプロジェクト', () => {
  /** サムネイル名だけを変えたプロジェクトをフォルダに保存し、そのフォルダを返す */
  async function saveNamedProject(folder: string, thumbnailName: string) {
    reload()
    state().renameThumbnail(state().thumbnails[0].id, thumbnailName)
    setCurrentDirectory(null)
    picked = makeHandle(folder)
    await saveProjectFolder(agree)
    return picked
  }

  const names = () => state().recentProjects.map((p) => p.folderName)
  const idOf = (folder: string) =>
    state().recentProjects.find((p) => p.folderName === folder)?.id as string

  it('開いたフォルダが新しい順に残り、同じフォルダは重複しない', async () => {
    const a = await saveNamedProject('A', 'サムネA')
    await saveNamedProject('B', 'サムネB')
    expect(names()).toEqual(['B', 'A'])

    picked = a
    await openProjectFolder()
    expect(names()).toEqual(['A', 'B'])

    // リロードしても履歴は残る
    reload()
    await restoreWorkspace()
    expect(names()).toEqual(['A', 'B'])
  })

  it('履歴を持つ前から繋いでいたフォルダは、起動時に履歴へ載る', async () => {
    await saveNamedProject('A', 'サムネA')
    kvStore.delete('handle:recent')
    permission.state = 'prompt'

    reload()
    await restoreWorkspace()
    expect(state().workspaceStatus).toBe('needs-permission')
    expect(names()).toEqual(['A'])

    // マニフェスト名が未確認でも、切り替えの操作で許可を得て開ける
    expect(await switchRecentProject(idOf('A'))).toBe(true)
    expect(state().thumbnails[0].name).toBe('サムネA')
    expect(state().recentProjects[0].manifestName).toBe('A.thumbpon')
  })

  it('切り替えると、そのプロジェクトの内容が読み込まれる', async () => {
    await saveNamedProject('A', 'サムネA')
    await saveNamedProject('B', 'サムネB')

    expect(await switchRecentProject(idOf('A'))).toBe(true)
    expect(state().workspaceFolderName).toBe('A')
    expect(state().thumbnails[0].name).toBe('サムネA')
    expect(names()).toEqual(['A', 'B'])
  })

  it('未保存の変更は、切り替える前に元のフォルダへ保存される', async () => {
    await saveNamedProject('A', 'サムネA')
    const b = await saveNamedProject('B', 'サムネB')

    state().renameThumbnail(state().thumbnails[0].id, 'サムネB 改')
    state().setWorkspaceDirty(true)
    await switchRecentProject(idOf('A'))

    const project = JSON.parse((await dumpFiles(b))['B.thumbpon'])
    expect(project.thumbnails[0].name).toBe('サムネB 改')
    expect(state().workspaceDirty).toBe(false)
  })

  it('消えたフォルダは、今の作業に触れず履歴から外す', async () => {
    const a = await saveNamedProject('A', 'サムネA')
    await saveNamedProject('B', 'サムネB')
    deleteEntry(a, 'A.thumbpon')

    await expect(switchRecentProject(idOf('A'))).rejects.toThrow()
    expect(names()).toEqual(['B'])
    expect(state().workspaceFolderName).toBe('B')
    expect(state().thumbnails[0].name).toBe('サムネB')
  })
})
