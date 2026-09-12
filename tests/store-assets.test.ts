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

describe('initAssets', () => {
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
