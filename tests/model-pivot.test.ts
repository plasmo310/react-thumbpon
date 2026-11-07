import { describe, expect, it } from 'vitest'
import { createImageLayer } from '@/domain/layer'
import {
  PIVOT_PRESETS,
  pivotOf,
  pivotPoint,
  placeByPivot,
  resizeKeepingPivot,
} from '@/domain/pivot'

const image = (pivot?: { x: number; y: number }) => ({
  ...createImageLayer('a', 'asset', { x: 100, y: 200, width: 400, height: 300 }),
  ...(pivot ? { pivot } : {}),
})

describe('pivot', () => {
  it('基準点が無い旧データは左上として扱い、座標の意味は変わらない', () => {
    const layer = image()
    expect(pivotOf(layer)).toEqual({ x: 0, y: 0 })
    expect(pivotPoint(layer)).toEqual({ x: 100, y: 200 })
  })

  it('9点のプリセットが左上から右下の順に並ぶ', () => {
    expect(PIVOT_PRESETS).toHaveLength(9)
    expect(PIVOT_PRESETS[0]).toEqual({ x: 0, y: 0 })
    expect(PIVOT_PRESETS[4]).toEqual({ x: 0.5, y: 0.5 })
    expect(PIVOT_PRESETS[8]).toEqual({ x: 1, y: 1 })
  })

  it('下端中央の基準点は、枠の下端中央の位置を指す', () => {
    expect(pivotPoint(image({ x: 0.5, y: 1 }))).toEqual({ x: 300, y: 500 })
  })

  it('基準点を指定位置に置く左上座標を返す', () => {
    const layer = image({ x: 0.5, y: 1 })
    expect(placeByPivot(layer, { x: 640, y: 700 })).toMatchObject({ x: 440, y: 400 })
  })

  it('サイズを変えても基準点は動かない（下端合わせが保たれる）', () => {
    const layer = image({ x: 0.5, y: 1 })
    const resized = resizeKeepingPivot(layer, { width: 200, height: 150 })
    expect(resized).toEqual({ x: 200, y: 350, width: 200, height: 150 })
    expect(pivotPoint({ ...layer, ...resized })).toEqual(pivotPoint(layer))
  })

  it('左上基準なら、サイズ変更で左上が動かない', () => {
    expect(resizeKeepingPivot(image(), { width: 200 })).toMatchObject({
      x: 100,
      y: 200,
      width: 200,
    })
  })
})
