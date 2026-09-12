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
const { openProjectFolder, saveProjectFolder } =
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
    missingFontLabels: [],
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
    expect(await openProjectFolder(agree)).toBe(true)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      'assets/風景/' + assetId + '.png',
      'project.json',
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
    await openProjectFolder(agree)

    await state().renameAssetFolder(state().assetFolders[0].id, '人物')
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      'assets/人物/' + assetId + '.png',
      'project.json',
    ])

    reload()
    await restoreWorkspace()
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
  })

  it('フォルダ名をアプリの外から変えられても、id でファイルを拾い直す', async () => {
    const { assetId, folderId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await openProjectFolder(agree)

    // OS や手作業でフォルダ名だけ変わった状況。project.json のパスとは合わなくなる
    renameEntry(picked, 'assets/風景', 'landscape')

    reload()
    await restoreWorkspace()

    expect(state().assets.map((a) => a.folderId)).toEqual([folderId])
    expect(await (await getAssetBlob(assetId))?.text()).toBe('bytes-of-a.png')
  })

  it('フォルダ側のファイルが消えていても、ブラウザ内に残っていれば素材を落とさない', async () => {
    const { assetId } = await withFolderedAsset('風景')
    picked = makeHandle('work')
    await openProjectFolder(agree)

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
    await openProjectFolder(agree)

    // ブラウザ内の実体だけを失った状況（フォルダ側のファイルが最後の1つ）
    kvStore.delete(`blob:${assetId}`)
    await saveProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked))).toContain(`assets/風景/${assetId}.png`)
    const project = JSON.parse((await dumpFiles(picked))['project.json'])
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
    await openProjectFolder(agree)

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
    await openProjectFolder(agree)

    expect(Object.keys(await dumpFiles(picked)).sort()).toEqual([
      `assets/${root.id}.png`,
      `assets/風景/${assetId}.png`,
      'project.json',
    ])

    reload()
    await restoreWorkspace()
    expect(state().assets).toHaveLength(2)
  })
})
