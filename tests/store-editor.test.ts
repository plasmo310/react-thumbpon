import { beforeEach, describe, expect, it } from 'vitest'
import { createTextLayer, createThumbnail } from '../src/lib/core/factory'
import { useEditorStore } from '../src/store'
import { BACKGROUND_ID, type Thumbnail } from '../src/types'

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
  })
  return thumbnail
}

/** 現在のサムネイルのレイヤーを名前の並びで見る。index 0 が最背面 */
const order = () => useEditorStore.getState().thumbnails[0].layers.map((l) => l.name)

/** id で引けるようにする */
const idOf = (name: string) =>
  useEditorStore.getState().thumbnails[0].layers.find((l) => l.name === name)!.id

beforeEach(() => {
  useEditorStore.setState({ selectedId: null, propertiesOpen: false })
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

describe('moveLayer', () => {
  beforeEach(() => withLayers(['a', 'b', 'c']))

  it('1 で前面へ、-1 で背面へ隣と入れ替える', () => {
    useEditorStore.getState().moveLayer(idOf('a'), 1)
    expect(order()).toEqual(['b', 'a', 'c'])
    useEditorStore.getState().moveLayer(idOf('a'), -1)
    expect(order()).toEqual(['a', 'b', 'c'])
  })

  it('端では何もしない', () => {
    useEditorStore.getState().moveLayer(idOf('a'), -1)
    useEditorStore.getState().moveLayer(idOf('c'), 1)
    expect(order()).toEqual(['a', 'b', 'c'])
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
