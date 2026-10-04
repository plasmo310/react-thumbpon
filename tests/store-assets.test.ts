import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/storage/assetRepo', () => import('./helpers/fakeAssetRepo'))

import { resetAssets, saved, seedAsset } from './helpers/fakeAssetRepo'
import { useEditorStore } from '@/app/store'
import { createThumbnail } from '@/domain/thumbnail'
import { createImageLayer } from '@/domain/layer'
import type { AssetFolder, AssetMeta } from '@/domain/asset'

const meta = (id: string, folderId: string | null = null): AssetMeta => ({
  id,
  name: `${id}.png`,
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
  folderId,
})

const folder = (id: string, name: string): AssetFolder => ({ id, name, collapsed: false })

const state = () => useEditorStore.getState()

beforeEach(() => {
  resetAssets()
  const thumbnail = createThumbnail('サムネイル 1')
  useEditorStore.setState({
    assets: [],
    assetFolders: [],
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    selectedId: null,
  })
})

describe('素材フォルダ', () => {
  it('子フォルダを追加して親を開き、階層を保存する', async () => {
    useEditorStore.setState({ assetFolders: [{ ...folder('f1', '親'), collapsed: true }] })
    await state().addAssetFolder('f1')
    expect(state().assetFolders[1].parentId).toBe('f1')
    expect(state().assetFolders[0].collapsed).toBe(false)
    expect(saved.folders).toEqual(state().assetFolders)
    await state().addAssetFolder('missing')
    expect(state().assetFolders).toHaveLength(2)
  })

  it('フォルダを子孫ごと移動し、最上位にも戻せる', async () => {
    useEditorStore.setState({
      assetFolders: [
        folder('f1', '親'),
        { ...folder('f2', '子'), parentId: 'f1' },
        { ...folder('f3', '別の親'), collapsed: true },
      ],
    })
    await state().moveAssetFolder('f1', 'f3')
    expect(state().assetFolders[0].parentId).toBe('f3')
    expect(state().assetFolders[1].parentId).toBe('f1')
    expect(state().assetFolders[2].collapsed).toBe(false)
    expect(saved.folders).toEqual(state().assetFolders)
    await state().moveAssetFolder('f1', null)
    expect(state().assetFolders[0].parentId).toBeNull()
  })

  it('自分自身・子孫・存在しない親への移動を防ぐ', async () => {
    const folders = [folder('f1', '親'), { ...folder('f2', '子'), parentId: 'f1' }]
    useEditorStore.setState({ assetFolders: folders })
    await state().moveAssetFolder('f1', 'f1')
    await state().moveAssetFolder('f1', 'f2')
    await state().moveAssetFolder('f1', 'missing')
    await state().reorderAssetFolder('f1', 'f2', 'after')
    expect(state().assetFolders).toEqual(folders)
  })

  it('親削除で子孫も削除し、全階層の素材を未分類として保存する', async () => {
    useEditorStore.setState({
      assetFolders: [
        folder('f1', '親'),
        { ...folder('f2', '子'), parentId: 'f1' },
        { ...folder('f3', '孫'), parentId: 'f2' },
        folder('f4', '別'),
      ],
      assets: [meta('a1', 'f1'), meta('a2', 'f2'), meta('a3', 'f3'), meta('a4', 'f4')],
    })
    await state().removeAssetFolder('f1')
    expect(state().assetFolders.map((f) => f.id)).toEqual(['f4'])
    expect(state().assets.map((a) => a.folderId)).toEqual([null, null, null, 'f4'])
    expect(saved.metas).toEqual(state().assets)
    expect(saved.folders).toEqual(state().assetFolders)
  })
  it('追加すると IndexedDB 側にも書き戻る（プロジェクトとは別に持つため）', async () => {
    await state().addAssetFolder()
    expect(state().assetFolders).toHaveLength(1)
    expect(saved.folders).toEqual(state().assetFolders)
  })

  it('名前を変えると書き出し先のフォルダ名も変わる', async () => {
    useEditorStore.setState({ assetFolders: [folder('f1', '素材 1')] })
    await state().renameAssetFolder('f1', '風景')
    expect(state().assetFolders[0].name).toBe('風景')
    expect(saved.folders[0].name).toBe('風景')
  })

  it('開閉の状態も覚える', async () => {
    useEditorStore.setState({ assetFolders: [folder('f1', '素材 1')] })
    await state().toggleAssetFolder('f1')
    expect(state().assetFolders[0].collapsed).toBe(true)
    expect(saved.folders[0].collapsed).toBe(true)
  })

  it('削除しても中の素材は消さず、未分類へ移す', async () => {
    useEditorStore.setState({ assetFolders: [folder('f1', '素材 1')], assets: [meta('a1', 'f1')] })
    await state().removeAssetFolder('f1')
    expect(state().assetFolders).toEqual([])
    expect(state().assets[0].folderId).toBeNull()
    expect(saved.metas[0].folderId).toBeNull()
  })
})

describe('moveAssetToFolder', () => {
  it('素材の所属だけを変え、メタを書き戻す', async () => {
    useEditorStore.setState({ assetFolders: [folder('f1', '素材 1')], assets: [meta('a1')] })
    await state().moveAssetToFolder('a1', 'f1')
    expect(state().assets[0].folderId).toBe('f1')
    expect(saved.metas[0].folderId).toBe('f1')
  })
})

describe('reorderAsset', () => {
  it('指定した素材の前後へ並べ替え、メタを保存する', async () => {
    useEditorStore.setState({
      assets: [meta('a1'), meta('a2', 'f1'), meta('a3')],
      assetFolders: [folder('f1', '素材 1')],
    })

    await state().reorderAsset('a1', 'a2', 'after')

    expect(state().assets.map((asset) => asset.id)).toEqual(['a2', 'a1', 'a3'])
    expect(state().assets[1].folderId).toBe('f1')
    expect(saved.metas.map((asset) => asset.id)).toEqual(['a2', 'a1', 'a3'])
  })
})

describe('reorderAssetFolder', () => {
  it('別階層のフォルダの前後へ移すと親も引き継ぐ', async () => {
    useEditorStore.setState({
      assetFolders: [
        folder('f1', '親'),
        { ...folder('f2', '子'), parentId: 'f1' },
        folder('f3', '移動元'),
      ],
    })
    await state().reorderAssetFolder('f3', 'f2', 'before')
    expect(state().assetFolders.map((f) => f.id)).toEqual(['f1', 'f3', 'f2'])
    expect(state().assetFolders[1].parentId).toBe('f1')
    expect(saved.folders).toEqual(state().assetFolders)
  })
  it('指定したフォルダの前後へ並べ替え、保存する', async () => {
    useEditorStore.setState({
      assetFolders: [folder('f1', '1'), folder('f2', '2'), folder('f3', '3')],
    })

    await state().reorderAssetFolder('f1', 'f2', 'after')

    expect(state().assetFolders.map((assetFolder) => assetFolder.id)).toEqual(['f2', 'f1', 'f3'])
    expect(saved.folders.map((assetFolder) => assetFolder.id)).toEqual(['f2', 'f1', 'f3'])
  })
})

describe('initAssets', () => {
  it('階層と開閉状態を復元する', async () => {
    saved.folders = [folder('f1', '親'), { ...folder('f2', '子'), parentId: 'f1', collapsed: true }]
    saved.metas = [meta('a1', 'f2')]
    await state().initAssets()
    expect(state().assetFolders).toEqual(saved.folders)
    expect(state().assets[0].folderId).toBe('f2')
  })

  it('存在しない親と循環する親参照を最上位に戻す', async () => {
    saved.folders = [
      { ...folder('f1', '孤立'), parentId: 'missing' },
      { ...folder('f2', '循環1'), parentId: 'f3' },
      { ...folder('f3', '循環2'), parentId: 'f2' },
      { ...folder('f4', '自己参照'), parentId: 'f4' },
      { ...folder('f5', '子'), parentId: 'f2' },
    ]
    await state().initAssets()
    expect(state().assetFolders.map((f) => f.parentId)).toEqual([null, null, null, null, 'f2'])
  })
  it('保存済みの素材とフォルダを読み込む', async () => {
    saved.metas = [meta('a1', 'f1')]
    saved.folders = [folder('f1', '風景')]
    await state().initAssets()
    expect(state().assets.map((a) => a.folderId)).toEqual(['f1'])
    expect(state().assetFolders).toHaveLength(1)
  })

  it('無くなったフォルダを指す素材は未分類に落とす', async () => {
    saved.metas = [meta('a1', 'gone')]
    saved.folders = []
    await state().initAssets()
    expect(state().assets[0].folderId).toBeNull()
  })
})

describe('removeAsset', () => {
  it('その素材を使っているレイヤーも一緒に外す', async () => {
    const layer = createImageLayer('a1.png', 'a1', { x: 0, y: 0, width: 10, height: 10 })
    const thumbnail = { ...createThumbnail('サムネイル 1'), layers: [layer] }
    useEditorStore.setState({
      assets: [meta('a1')],
      thumbnails: [thumbnail],
      currentThumbnailId: thumbnail.id,
    })
    seedAsset('a1', new Blob(['x']))

    await state().removeAsset('a1')
    expect(state().assets).toEqual([])
    expect(state().thumbnails[0].layers).toEqual([])
  })
})
