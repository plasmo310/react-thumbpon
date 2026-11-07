import { describe, expect, it } from 'vitest'
import {
  cornerPoints,
  dragFactor,
  factorFloor,
  groupBounds,
  rotatedBounds,
  scaleGroup,
  snapFactor,
  type GroupItem,
} from '@/domain/groupScale'
import { createShapeLayer, createTextLayer } from '@/domain/layer'

const canvas = { width: 1000, height: 500 }

const shape = (x: number, y: number, width: number, height: number, rotation = 0): GroupItem => ({
  layer: { ...createShapeLayer(canvas, 'rectangle'), x, y, width, height, rotation },
  height,
})

describe('groupBounds', () => {
  it('複数レイヤーの外接矩形を返す', () => {
    expect(groupBounds([shape(100, 50, 100, 100), shape(300, 200, 50, 80)])).toEqual({
      x: 100,
      y: 50,
      width: 250,
      height: 230,
    })
  })

  it('回転したレイヤーは見た目の外形で数える', () => {
    const rotated = rotatedBounds({ x: 0, y: 0, width: 100, height: 100 }, 45)
    expect(rotated.width).toBeCloseTo(141.42, 1)
    expect(groupBounds([])).toBeNull()
  })
})

describe('scaleGroup', () => {
  const items = [shape(100, 100, 100, 100), shape(300, 100, 100, 100)]
  const box = groupBounds(items)!

  it('掴んだ角の対角を固定して位置と大きさを倍率で拡縮する', () => {
    const { anchor } = cornerPoints(box, 'se')
    expect(anchor).toEqual({ x: 100, y: 100 })
    const patches = scaleGroup(items, anchor, 2)
    expect(patches.get(items[0].layer.id)).toMatchObject({
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    })
    expect(patches.get(items[1].layer.id)).toMatchObject({
      x: 500,
      y: 100,
      width: 200,
      height: 200,
    })
  })

  it('左上の角を掴んだときは右下が固定される', () => {
    const { anchor } = cornerPoints(box, 'nw')
    expect(anchor).toEqual({ x: 400, y: 200 })
    const patches = scaleGroup(items, anchor, 0.5)
    expect(patches.get(items[1].layer.id)).toMatchObject({ x: 350, y: 150, width: 50, height: 50 })
  })

  it('テキストは文字サイズも倍率で変わり、角度は保たれる', () => {
    const text = createTextLayer(canvas)
    const item: GroupItem = {
      layer: { ...text, x: 0, y: 0, width: 200, rotation: 30 },
      height: 100,
    }
    const patch = scaleGroup([item], { x: 0, y: 0 }, 2).get(text.id) as Record<string, number>
    expect(patch.width).toBe(400)
    expect(patch.fontSize).toBe(text.fontSize * 2)
    expect(patch.rotation).toBeUndefined()
  })
})

describe('dragFactor / snapFactor', () => {
  const items = [shape(100, 100, 100, 100), shape(300, 100, 100, 100)]
  const box = groupBounds(items)!

  it('対角線方向のドラッグ量から倍率を求める', () => {
    // 外接矩形は 300x100。右下を右へ 300 動かすと幅は 2 倍
    expect(dragFactor(box, 'se', 300, 100, 0.1)).toBeGreaterThan(1.9)
    expect(dragFactor(box, 'se', 0, 0, 0.1)).toBeCloseTo(1)
  })

  it('小さくしすぎても下限で止まる', () => {
    const floor = factorFloor(items)
    expect(floor).toBeCloseTo(0.08)
    expect(dragFactor(box, 'se', -1000, -1000, floor)).toBe(floor)
  })

  it('掴んだ角が吸着線に近ければ、そこに載る倍率へ寄せてガイドを返す', () => {
    // 固定点 x=100、右端は 400。キャンバス右端 1000 に載る倍率は 3 (幅 300 → 900)
    const near = snapFactor(box, 'se', 2.98, [0, 500, 1000], [], 8, 0.1)
    expect(near.factor).toBeCloseTo(3)
    expect(near.guidesX).toEqual([1000])
    const far = snapFactor(box, 'se', 2.5, [0, 500, 1000], [], 8, 0.1)
    expect(far).toEqual({ factor: 2.5, guidesX: [], guidesY: [] })
  })
})
