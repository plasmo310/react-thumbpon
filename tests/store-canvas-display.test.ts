import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore, pickDocument } from '@/app/store'
import { DEFAULT_GRID, visibleThumbnails } from '@/domain/canvasLayout'
import { createThumbnail } from '@/domain/thumbnail'

const state = () => useEditorStore.getState()
const visible = () => {
  const s = state()
  return visibleThumbnails(s.thumbnails, s.folders, s.pinnedThumbnailIds, s.currentThumbnailId).map(
    (t) => t.id,
  )
}

beforeEach(() => {
  state().loadProject({
    folders: [{ id: 'folder', name: 'folder', collapsed: false }],
    thumbnails: [
      createThumbnail('a', 'folder'),
      createThumbnail('b', 'folder'),
      createThumbnail('root'),
    ],
  })
  state().setGridSettings(DEFAULT_GRID)
})

describe('常時表示と編集対象', () => {
  it('チェックでは編集対象を変えず、編集中はチェックなしでも表示する', () => {
    const [a, b, root] = state().thumbnails
    state().toggleThumbnailPinned(b.id)
    expect(state().currentThumbnailId).toBe(a.id)
    expect(visible()).toEqual([a.id, b.id])
    state().selectThumbnail(root.id)
    expect(visible()).toEqual([root.id, b.id])
    state().toggleThumbnailPinned(root.id)
    expect(visible()).toEqual([root.id, b.id])
    state().toggleThumbnailPinned(root.id)
    expect(visible()).toEqual([root.id, b.id])
    state().selectThumbnail(a.id)
    expect(visible()).toEqual([a.id, b.id])
  })

  it('フォルダの一部選択は全件選択へ、全件選択は解除へ切り替える', () => {
    const [a, b, root] = state().thumbnails
    state().toggleThumbnailPinned(root.id)
    state().toggleThumbnailPinned(a.id)
    state().toggleFolderPinned('folder')
    expect(new Set(state().pinnedThumbnailIds)).toEqual(new Set([root.id, a.id, b.id]))
    state().toggleFolder('folder')
    expect(visible()).toHaveLength(3)
    state().toggleFolderPinned('folder')
    expect(state().pinnedThumbnailIds).toEqual([root.id])
    state().toggleFolderPinned('missing')
    state().toggleThumbnailPinned('missing')
    expect(state().pinnedThumbnailIds).toEqual([root.id])
  })

  it('移動・フォルダ削除でチェックを変えず、サムネイル削除でIDを除く', () => {
    const [a, b, root] = state().thumbnails
    state().toggleFolderPinned('folder')
    state().moveThumbnailToFolder(root.id, 'folder')
    expect(state().pinnedThumbnailIds).not.toContain(root.id)
    state().removeFolder('folder')
    expect(new Set(state().pinnedThumbnailIds)).toEqual(new Set([a.id, b.id]))
    state().removeThumbnail(b.id)
    expect(state().pinnedThumbnailIds).toEqual([a.id])
  })

  it('読み込みはチェックだけ解除し、追加・複製はチェックせず編集対象にする', () => {
    const a = state().thumbnails[0]
    state().toggleThumbnailPinned(a.id)
    state().duplicateThumbnail(a.id)
    expect(state().pinnedThumbnailIds).toEqual([a.id])
    expect(state().currentThumbnailId).not.toBe(a.id)
    state().addThumbnail()
    expect(state().pinnedThumbnailIds).not.toContain(state().currentThumbnailId)
    state().setGridSettings({ axis: 'rows', count: 3 })
    state().loadProject({ thumbnails: [createThumbnail('new')], folders: [] })
    expect(state().pinnedThumbnailIds).toEqual([])
    expect(state().gridSettings).toEqual({ axis: 'rows', count: 3 })
  })

  it('表示設定の変更は保存ドキュメント・履歴に含めず、Undoでも保持する', () => {
    const a = state().thumbnails[0]
    const document = pickDocument(state())
    state().recordHistory()
    state().renameThumbnail(a.id, 'changed')
    state().toggleThumbnailPinned(a.id)
    state().setGridSettings({ axis: 'rows', count: 3 })
    state().undo()
    expect(pickDocument(state())).toEqual(document)
    expect(state().pinnedThumbnailIds).toEqual([a.id])
    expect(state().gridSettings).toEqual({ axis: 'rows', count: 3 })
  })

  it('復元時は存在しないIDや重複を除外し、旧データでも起動できる', () => {
    const id = state().thumbnails[0].id
    state().restoreCanvasDisplay({ pinnedThumbnailIds: ['missing', id, id] })
    expect(state().pinnedThumbnailIds).toEqual([id])
    state().restoreCanvasDisplay({})
    expect(state().pinnedThumbnailIds).toEqual([])
    expect(state().gridSettings).toEqual(DEFAULT_GRID)
  })

  it('同じサムネイルの再選択でレイヤー選択を消さず、切り替え時は編集UIをリセットする', () => {
    state().addShapeLayer('rectangle')
    const selectedId = state().selectedId
    state().selectThumbnail(state().currentThumbnailId)
    expect(state().selectedId).toBe(selectedId)
    state().setCropping(true)
    state().setGuides({ x: [10], y: [20] })
    state().selectThumbnail(state().thumbnails[1].id)
    expect(state().selectedIds).toEqual([])
    expect(state().cropping).toBe(false)
    expect(state().guides).toEqual({ x: [], y: [] })
  })
})
