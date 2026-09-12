import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => import('./helpers/fakeKv'))
vi.mock('@/shared/lib/storage/fsAccess', () => import('./helpers/fakeFs'))

import { resetKv } from './helpers/fakeKv'
import { fake, makeDir, resetFake } from './helpers/fakeFs'
import { restoreWorkspace } from '@/features/project/lib/workspace'
import { openProjectFolder, saveProjectFolder } from '@/features/project/lib/projectFolder'
import { getAssetBlob } from '@/shared/lib/storage/assetRepo'
import { useEditorStore } from '@/app/store'
import { createThumbnail } from '@/domain/thumbnail'

/*
 * 素材の実体は assetRepo（本物）を通して読み書きする。
 * ブラウザにしか無いものだけを最小限に埋める。
 */
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

const image = (name: string) => new File(['image-bytes'], name, { type: 'image/png' })

/** リロード相当。保存されたもの（fakeKv / fakeFs）だけを残して状態を初期値へ戻す */
function reload() {
  const thumbnail = createThumbnail('サムネイル 1')
  fake.current = null
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

/** 中身のあるフォルダを開くときの確認 */
const agree = () => true

beforeEach(() => {
  resetKv()
  resetFake()
  reload()
})

describe('フォルダに入れた素材の復元', () => {
  it('ブラウザ内(IndexedDB)だけで作業していても、フォルダごと残る', async () => {
    const [added] = await state().addAssetFiles([image('a.png')])
    await state().addAssetFolder()
    const folderId = state().assetFolders[0].id
    await state().moveAssetToFolder(added.id, folderId)

    reload()
    await restoreWorkspace()

    expect(state().assetFolders.map((f) => f.name)).toEqual(['素材 1'])
    expect(state().assets.map((a) => ({ id: a.id, folderId: a.folderId }))).toEqual([
      { id: added.id, folderId },
    ])
    expect(await getAssetBlob(added.id)).toBeDefined()
  })

  it('ワークスペースフォルダに保存してから開き直しても、フォルダごと残る', async () => {
    const [added] = await state().addAssetFiles([image('a.png')])
    await state().addAssetFolder()
    const folderId = state().assetFolders[0].id
    await state().moveAssetToFolder(added.id, folderId)
    state().addImageLayer(added.id)

    fake.picked = makeDir('work')
    expect(await openProjectFolder(agree)).toBe(true)
    await saveProjectFolder(agree)

    reload()
    await restoreWorkspace()

    expect(state().workspaceStatus).toBe('connected')
    expect(state().assetFolders.map((f) => f.name)).toEqual(['素材 1'])
    expect(state().assets.map((a) => ({ id: a.id, folderId: a.folderId }))).toEqual([
      { id: added.id, folderId },
    ])
    expect(await getAssetBlob(added.id)).toBeDefined()
    // 素材を参照しているレイヤーも残る（参照先が消えると一緒に外されてしまうため）
    expect(state().thumbnails[0].layers).toHaveLength(1)
  })
})
