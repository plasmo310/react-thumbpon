import { describe, expect, it } from 'vitest'
import { canvasLayout, DEFAULT_GRID, normalizeGrid, visibleThumbnails } from '@/domain/canvasLayout'
import { createThumbnail } from '@/domain/thumbnail'

describe('複数サムネイルの表示順', () => {
  it('未分類、フォルダ順でチェック済みと編集対象を重複なく並べる', () => {
    const root = createThumbnail('未分類')
    const a = createThumbnail('a', 'a')
    const b = createThumbnail('b', 'b')
    const hidden = createThumbnail('非表示', 'a')
    const folders = [
      { id: 'b', name: 'B', collapsed: true },
      { id: 'a', name: 'A', collapsed: false },
    ]
    expect(
      visibleThumbnails([a, hidden, b, root], folders, [a.id, b.id, root.id, 'missing'], a.id),
    ).toEqual([root, b, a])
    expect(visibleThumbnails([a, hidden, b, root], folders, [a.id], b.id)).toEqual([b, a])
  })
})

describe('グリッド配置', () => {
  const thumbnails = Array.from({ length: 5 }, (_, index) => createThumbnail(String(index)))

  it('3列で5枚なら2行になり、左上から行方向に並ぶ', () => {
    const layout = canvasLayout(thumbnails, { axis: 'columns', count: 3 })
    expect(layout).toMatchObject({ rows: 2, columns: 3 })
    expect(layout.cells[0]).toMatchObject({ x: 0, y: 0 })
    expect(layout.cells[1].x).toBeGreaterThan(layout.cells[0].x)
    expect(layout.cells[3].x).toBe(0)
    expect(layout.cells[3].y).toBeGreaterThan(0)
    expect(layout.cells).toHaveLength(5)
  })

  it('2行で5枚なら3列、1列・1行でも全枚数を表示する', () => {
    expect(canvasLayout(thumbnails, { axis: 'rows', count: 2 })).toMatchObject({
      rows: 2,
      columns: 3,
    })
    expect(canvasLayout(thumbnails, { axis: 'columns', count: 1 })).toMatchObject({
      rows: 5,
      columns: 1,
    })
    expect(canvasLayout(thumbnails, { axis: 'rows', count: 1 })).toMatchObject({
      rows: 1,
      columns: 5,
    })
    expect(canvasLayout(thumbnails, { axis: 'rows', count: 99 })).toMatchObject({
      rows: 5,
      columns: 1,
    })
  })

  it('1枚だけなら元の実寸を使う', () => {
    const thumbnail = createThumbnail('縦長', null, { width: 1080, height: 1920 })
    expect(canvasLayout([thumbnail], DEFAULT_GRID)).toMatchObject({
      width: 1080,
      height: 1920,
      cells: [{ id: thumbnail.id, scale: 1, canvasX: 0, canvasY: 0 }],
    })
  })

  it('サイズ混在でも同じセル内に縦横比を維持して収める', () => {
    const wide = createThumbnail('横長', null, { width: 1920, height: 1080 })
    const tall = createThumbnail('縦長', null, { width: 1080, height: 1920 })
    const layout = canvasLayout([wide, tall], DEFAULT_GRID)
    const [first, second] = layout.cells
    expect(first.width).toBe(second.width)
    expect(first.height).toBe(second.height)
    expect(second.scale).toBe(1080 / 1920)
    expect(second.canvasX).toBeGreaterThan(second.x)
    expect(tall.canvas.width * second.scale).toBeLessThan(second.width)
  })

  it('不正値を既定値または1以上の整数に揃える', () => {
    expect(normalizeGrid(undefined)).toEqual(DEFAULT_GRID)
    expect(normalizeGrid({ axis: 'rows', count: NaN })).toEqual({ axis: 'rows', count: 2 })
    expect(normalizeGrid({ count: Infinity }).count).toBe(2)
    expect(normalizeGrid({ count: -2 }).count).toBe(1)
    expect(normalizeGrid({ count: 3.7 }).count).toBe(3)
  })
})
