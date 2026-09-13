import { beforeEach, describe, expect, it } from 'vitest'
import { createImageLayer, createTextLayer } from '@/domain/layer'
import { createThumbnail } from '@/domain/thumbnail'
import { useEditorStore } from '@/app/store'
import { BACKGROUND_ID } from '@/domain/background'
import type { ImageLayer } from '@/domain/layer'
import type { Thumbnail } from '@/domain/thumbnail'

/** 名前で追えるようにした、中身の無いテキストレイヤー */
function layer(name: string) {
  return { ...createTextLayer({ width: 100, height: 100 }), name }
}

/** レイヤーを並べた1枚のサムネイルだけがある状態にする */
function withLayers(names: string[]) {
  const thumbnail: Thumbnail = { ...createThumbnail('サムネイル 1'), layers: names.map(layer) }
  useEditorStore.setState({
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    selectedId: null,
    selectedIds: [],
  })
  return thumbnail
}

/** 現在のサムネイルのレイヤーを名前の並びで見る。index 0 が最背面 */
const order = () => useEditorStore.getState().thumbnails[0].layers.map((l) => l.name)

/** id で引けるようにする */
const idOf = (name: string) =>
  useEditorStore.getState().thumbnails[0].layers.find((l) => l.name === name)!.id

beforeEach(() => {
  useEditorStore.setState({
    selectedId: null,
    selectedIds: [],
    propertiesOpen: false,
    historyPast: [],
    historyFuture: [],
  })
})

describe('reorderLayer', () => {
  // insertIndex は「元の配列のこの要素の手前に入れる」位置(0..length)
  beforeEach(() => withLayers(['a', 'b', 'c', 'd']))

  it('前面へ動かすと、指定した要素の手前に入る', () => {
    useEditorStore.getState().reorderLayer(0, 3)
    expect(order()).toEqual(['b', 'c', 'a', 'd'])
  })

  it('背面へ動かすと、指定した要素の手前に入る', () => {
    useEditorStore.getState().reorderLayer(3, 0)
    expect(order()).toEqual(['d', 'a', 'b', 'c'])
  })

  it('末尾に落とすと最前面になる', () => {
    useEditorStore.getState().reorderLayer(0, 4)
    expect(order()).toEqual(['b', 'c', 'd', 'a'])
  })

  it('自分の位置に落としても動かない', () => {
    useEditorStore.getState().reorderLayer(1, 1)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('自分のすぐ後ろに落としても動かない（同じ並びになるため）', () => {
    useEditorStore.getState().reorderLayer(1, 2)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('範囲外の位置を渡しても壊れない', () => {
    useEditorStore.getState().reorderLayer(-1, 0)
    useEditorStore.getState().reorderLayer(9, 0)
    expect(order()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('addShapeLayer', () => {
  it('最前面に追加して、その図形を選択する', () => {
    const thumbnail = withLayers(['下のテキスト'])
    useEditorStore.getState().addShapeLayer('rectangle')

    const layers = useEditorStore.getState().thumbnails[0].layers
    const shape = layers[layers.length - 1]
    expect(shape).toMatchObject({ type: 'shape', shape: 'rectangle' })
    expect(useEditorStore.getState().selectedId).toBe(shape.id)
    expect(useEditorStore.getState().selectedIds).toEqual([shape.id])
    expect(useEditorStore.getState().propertiesOpen).toBe(true)
    expect(useEditorStore.getState().historyPast).toHaveLength(1)
    expect(thumbnail.layers).toHaveLength(1)
  })
})

describe('moveLayer', () => {
  beforeEach(() => withLayers(['a', 'b', 'c']))

  it('forward で前面へ、backward で背面へ隣と入れ替える', () => {
    useEditorStore.getState().moveLayer(idOf('a'), 'forward')
    expect(order()).toEqual(['b', 'a', 'c'])
    useEditorStore.getState().moveLayer(idOf('a'), 'backward')
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('front / back で端まで送る', () => {
    useEditorStore.getState().moveLayer(idOf('a'), 'front')
    expect(order()).toEqual(['b', 'c', 'a'])
    useEditorStore.getState().moveLayer(idOf('a'), 'back')
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('端では何もしない', () => {
    useEditorStore.getState().moveLayer(idOf('a'), 'backward')
    useEditorStore.getState().moveLayer(idOf('a'), 'back')
    useEditorStore.getState().moveLayer(idOf('c'), 'forward')
    useEditorStore.getState().moveLayer(idOf('c'), 'front')
    expect(order()).toEqual(['a', 'b', 'c'])
  })
})

describe('updateLayerCrop', () => {
  /** 画像レイヤー1枚だけの状態にして、その id を返す */
  function withImage() {
    const layer = createImageLayer('a1.png', 'a1', { x: 0, y: 0, width: 100, height: 100 })
    const thumbnail: Thumbnail = { ...createThumbnail('サムネイル 1'), layers: [layer] }
    useEditorStore.setState({ thumbnails: [thumbnail], currentThumbnailId: thumbnail.id })
    return layer.id
  }

  /** 現在の画像レイヤー */
  const image = () => useEditorStore.getState().thumbnails[0].layers[0] as ImageLayer

  it('指定した辺だけを変える（入れ子なので専用の口を通す）', () => {
    const id = withImage()
    useEditorStore.getState().updateLayerCrop(id, { top: 0.2 })
    useEditorStore.getState().updateLayerCrop(id, { left: 0.1 })
    expect(image().crop).toEqual({ top: 0.2, right: 0, bottom: 0, left: 0.1 })
  })

  it('枠も一緒に詰める（キャンバスで端を掴んだとき）', () => {
    const id = withImage()
    useEditorStore.getState().updateLayerCrop(id, { left: 0.25 }, { x: 25, width: 75 })
    expect(image()).toMatchObject({ x: 25, width: 75 })
    expect(image().crop.left).toBe(0.25)
  })

  it('画像以外のレイヤーには効かない', () => {
    withLayers(['a'])
    const id = idOf('a')
    useEditorStore.getState().updateLayerCrop(id, { top: 0.5 })
    expect(useEditorStore.getState().thumbnails[0].layers[0]).not.toHaveProperty('crop')
  })
})

describe('removeLayer', () => {
  beforeEach(() => withLayers(['a', 'b']))

  it('選択中のレイヤーを消すと選択も外れる', () => {
    const id = idOf('a')
    useEditorStore.getState().select(id)
    useEditorStore.getState().removeLayer(id)
    expect(order()).toEqual(['b'])
    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('選択していないレイヤーを消しても選択は残る', () => {
    const selected = idOf('a')
    useEditorStore.getState().select(selected)
    useEditorStore.getState().removeLayer(idOf('b'))
    expect(useEditorStore.getState().selectedId).toBe(selected)
  })
})

describe('removeLayers', () => {
  beforeEach(() => withLayers(['a', 'b', 'c']))

  it('複数まとめて消せる', () => {
    useEditorStore.getState().removeLayers([idOf('a'), idOf('c')])
    expect(order()).toEqual(['b'])
  })

  it('複数選択の一員（主選択ではない）を消しても、複数選択からだけ外れる', () => {
    const a = idOf('a')
    const b = idOf('b')
    useEditorStore.getState().select(a)
    useEditorStore.getState().select(b, { additive: true }) // b が主選択になる
    useEditorStore.getState().removeLayers([a])
    expect(useEditorStore.getState().selectedId).toBe(b)
    expect(useEditorStore.getState().selectedIds).toEqual([b])
  })

  it('主選択中のものを消すと選択も複数選択もまとめて外れる', () => {
    const a = idOf('a')
    const b = idOf('b')
    useEditorStore.getState().select(a)
    useEditorStore.getState().select(b, { additive: true }) // b が主選択になる
    useEditorStore.getState().removeLayers([b])
    expect(useEditorStore.getState().selectedId).toBeNull()
    expect(useEditorStore.getState().selectedIds).toEqual([])
  })
})

describe('select（Shift+クリックでの複数選択）', () => {
  beforeEach(() => withLayers(['a', 'b', 'c']))

  it('additive無しで選ぶと単一選択になる', () => {
    useEditorStore.getState().select(idOf('a'))
    expect(useEditorStore.getState().selectedId).toBe(idOf('a'))
    expect(useEditorStore.getState().selectedIds).toEqual([idOf('a')])
  })

  it('additiveで足すと複数選択になり、最後に足したものが主選択になる', () => {
    useEditorStore.getState().select(idOf('a'))
    useEditorStore.getState().select(idOf('b'), { additive: true })
    expect(useEditorStore.getState().selectedIds).toEqual([idOf('a'), idOf('b')])
    expect(useEditorStore.getState().selectedId).toBe(idOf('b'))
  })

  it('選択済みのものをadditiveで選ぶと外れる', () => {
    useEditorStore.getState().select(idOf('a'))
    useEditorStore.getState().select(idOf('b'), { additive: true })
    useEditorStore.getState().select(idOf('a'), { additive: true })
    expect(useEditorStore.getState().selectedIds).toEqual([idOf('b')])
  })

  it('背景を選ぶと複数選択が外れる', () => {
    useEditorStore.getState().select(idOf('a'))
    useEditorStore.getState().select(idOf('b'), { additive: true })
    useEditorStore.getState().select(BACKGROUND_ID)
    expect(useEditorStore.getState().selectedIds).toEqual([])
    expect(useEditorStore.getState().selectedId).toBe(BACKGROUND_ID)
  })
})

describe('Undo / Redo', () => {
  beforeEach(() => withLayers(['a', 'b']))

  it('recordHistory を挟んでからの変更は、まとめて1回で戻せる', () => {
    // nudgeLayer 自体は履歴を積まない。ドラッグや矢印キーの連続移動と同じ形
    const startX = useEditorStore.getState().thumbnails[0].layers[0].x
    useEditorStore.getState().recordHistory()
    useEditorStore.getState().nudgeLayer(idOf('a'), 10, 0)
    useEditorStore.getState().nudgeLayer(idOf('a'), 10, 0)
    expect(useEditorStore.getState().thumbnails[0].layers[0].x).toBe(startX + 20)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().thumbnails[0].layers[0].x).toBe(startX)
  })

  it('戻した内容はやり直せる', () => {
    useEditorStore.getState().duplicateLayer(idOf('a'))
    expect(order()).toEqual(['a', 'a のコピー', 'b'])
    useEditorStore.getState().undo()
    expect(order()).toEqual(['a', 'b'])
    useEditorStore.getState().redo()
    expect(order()).toEqual(['a', 'a のコピー', 'b'])
  })

  it('新しい変更をするとやり直し履歴は捨てられる', () => {
    useEditorStore.getState().duplicateLayer(idOf('a'))
    useEditorStore.getState().undo()
    useEditorStore.getState().addTextLayer()
    expect(useEditorStore.getState().historyFuture).toEqual([])
  })

  it('積んだものが無ければ何もしない', () => {
    const before = order()
    useEditorStore.getState().undo()
    expect(order()).toEqual(before)
  })
})

describe('openLayerMenu', () => {
  beforeEach(() => withLayers(['a', 'b']))

  it('対象を選んでから、出す位置を控える', () => {
    const id = idOf('b')
    useEditorStore.getState().openLayerMenu(id, 120, 240)
    const state = useEditorStore.getState()
    // どのレイヤーへの操作なのかが見て分かるよう、選択も移す
    expect(state.selectedId).toBe(id)
    expect(state.layerMenu).toEqual({ layerId: id, x: 120, y: 240 })
  })

  it('閉じると消える', () => {
    useEditorStore.getState().openLayerMenu(idOf('a'), 0, 0)
    useEditorStore.getState().closeLayerMenu()
    expect(useEditorStore.getState().layerMenu).toBeNull()
  })
})

describe('removeThumbnail', () => {
  /** 3枚のサムネイルを並べ、指定した位置を編集中にする */
  function withThumbnails(currentIndex: number) {
    const thumbnails = ['1枚目', '2枚目', '3枚目'].map((name) => createThumbnail(name))
    useEditorStore.setState({
      thumbnails,
      currentThumbnailId: thumbnails[currentIndex].id,
      selectedId: null,
    })
    return thumbnails
  }

  const names = () => useEditorStore.getState().thumbnails.map((t) => t.name)
  const currentName = () => {
    const { thumbnails, currentThumbnailId } = useEditorStore.getState()
    return thumbnails.find((t) => t.id === currentThumbnailId)?.name
  }

  it('編集中のものを消すと、ひとつ上へ移る', () => {
    const thumbnails = withThumbnails(1)
    useEditorStore.getState().removeThumbnail(thumbnails[1].id)
    expect(names()).toEqual(['1枚目', '3枚目'])
    expect(currentName()).toBe('1枚目')
  })

  it('先頭を消したときは、上が無いので新しい先頭へ移る', () => {
    const thumbnails = withThumbnails(0)
    useEditorStore.getState().removeThumbnail(thumbnails[0].id)
    expect(currentName()).toBe('2枚目')
  })

  it('編集中でないものを消しても編集対象は変わらない', () => {
    const thumbnails = withThumbnails(1)
    useEditorStore.getState().removeThumbnail(thumbnails[2].id)
    expect(currentName()).toBe('2枚目')
  })

  it('最後の1枚は消せない', () => {
    const thumbnail = createThumbnail('唯一')
    useEditorStore.setState({ thumbnails: [thumbnail], currentThumbnailId: thumbnail.id })
    useEditorStore.getState().removeThumbnail(thumbnail.id)
    expect(names()).toEqual(['唯一'])
  })
})

describe('reorderThumbnail', () => {
  it('指定したサムネイルの前後へ並べ替え、移動先のフォルダに入れる', () => {
    const thumbnails = ['a', 'b', 'c'].map((name) => createThumbnail(name))
    thumbnails[1].folderId = 'f1'
    useEditorStore.setState({ thumbnails, currentThumbnailId: thumbnails[0].id })

    useEditorStore.getState().reorderThumbnail(thumbnails[0].id, thumbnails[1].id, 'after')

    expect(useEditorStore.getState().thumbnails.map((thumbnail) => thumbnail.name)).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(useEditorStore.getState().thumbnails[1].folderId).toBe('f1')
  })
})

describe('reorderFolder', () => {
  it('指定したフォルダの前後へ並べ替える', () => {
    useEditorStore.setState({
      folders: [
        { id: 'f1', name: '1', collapsed: false },
        { id: 'f2', name: '2', collapsed: false },
        { id: 'f3', name: '3', collapsed: false },
      ],
    })

    useEditorStore.getState().reorderFolder('f1', 'f2', 'after')

    expect(useEditorStore.getState().folders.map((folder) => folder.id)).toEqual(['f2', 'f1', 'f3'])
  })
})

// slice は分かれているが実体は1つのオブジェクトなので、またいだ更新ができる。
// これは意図した設計なので、崩れていないことを固定しておく。
describe('slice をまたぐ更新', () => {
  it('サムネイルを切り替えるとレイヤーの選択が外れる', () => {
    const thumbnails = [createThumbnail('1枚目'), createThumbnail('2枚目')]
    useEditorStore.setState({ thumbnails, currentThumbnailId: thumbnails[0].id })
    useEditorStore.getState().select(BACKGROUND_ID)

    useEditorStore.getState().selectThumbnail(thumbnails[1].id)

    expect(useEditorStore.getState().selectedId).toBeNull()
  })

  it('別の対象を選ぶとプロパティ欄が開き直す', () => {
    withLayers(['a', 'b'])
    const first = idOf('a')
    useEditorStore.getState().select(first)
    expect(useEditorStore.getState().propertiesOpen).toBe(true)

    // 同じものを選び直したときは開閉状態を保つ
    useEditorStore.setState({ propertiesOpen: false })
    useEditorStore.getState().select(first)
    expect(useEditorStore.getState().propertiesOpen).toBe(false)

    // 別のものへ移ったら開く（何も出ず選べていないように見えるのを防ぐため）
    useEditorStore.getState().select(idOf('b'))
    expect(useEditorStore.getState().propertiesOpen).toBe(true)
  })
})
