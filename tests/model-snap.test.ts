import { describe, expect, it } from 'vitest'
import { snapPosition, type SnapRect } from '@/features/canvas/lib/snap'

const canvas = { width: 1000, height: 500 }
const THRESHOLD = 8

/** 100角の移動中レイヤー。指定するのは左上のキャンバス実寸座標 */
const moving = (x: number, y: number): SnapRect => ({ x, y, width: 100, height: 100 })

/** 吸着先を持たない場合。キャンバスの端と中央だけが候補になる */
const toCanvas = (rect: SnapRect) => snapPosition(rect, [], canvas, THRESHOLD)

describe('snapPosition', () => {
  it('どの線にも近くなければ動かさず、ガイドも出さない', () => {
    const result = toCanvas(moving(300, 300))
    expect(result).toEqual({ x: 300, y: 300, guidesX: [], guidesY: [] })
  })

  it('左端がキャンバスの左端に吸い付く', () => {
    const result = toCanvas(moving(3, 300))
    expect(result.x).toBe(0)
    expect(result.guidesX).toEqual([0])
  })

  it('右端がキャンバスの右端に吸い付く', () => {
    // 左上 897 + 幅100 = 997 なので、右端が 1000 へ 3 だけ寄る
    expect(toCanvas(moving(897, 300)).x).toBe(900)
  })

  it('中央どうしが吸い付く', () => {
    // 中央は 448 + 50 = 498。キャンバス中央 500 へ 2 だけ寄る
    const result = toCanvas(moving(448, 300))
    expect(result.x).toBe(450)
    expect(result.guidesX).toEqual([500])
  })

  it('しきい値ちょうどは吸着する', () => {
    expect(toCanvas(moving(THRESHOLD, 300)).x).toBe(0)
  })

  it('しきい値を1でも超えたら吸着しない', () => {
    const x = THRESHOLD + 1
    expect(toCanvas(moving(x, 300)).x).toBe(x)
  })

  it('縦と横は独立して判定する', () => {
    // 横は中央付近、縦はどこにも近くない
    const result = toCanvas(moving(448, 300))
    expect(result.guidesX).toEqual([500])
    expect(result.guidesY).toEqual([])
    expect(result.y).toBe(300)
  })

  it('候補が複数あれば最も近いものを選ぶ', () => {
    // 左端 5 はキャンバス左端(0)まで5、他レイヤーの左端(7)まで2 → 近い方へ
    const target: SnapRect = { x: 7, y: 400, width: 50, height: 50 }
    const result = snapPosition(moving(5, 300), [target], canvas, THRESHOLD)
    expect(result.x).toBe(7)
    expect(result.guidesX).toEqual([7])
  })

  it('他のレイヤーの端と中央にも吸い付く', () => {
    const target: SnapRect = { x: 200, y: 100, width: 100, height: 100 }
    // 移動中の左端 303 が、相手の右端 300 へ 3 だけ寄る
    const result = snapPosition(moving(303, 300), [target], canvas, THRESHOLD)
    expect(result.x).toBe(300)
    expect(result.guidesX).toEqual([300])
  })

  it('縦も端と中央に吸い付く', () => {
    // 上端 247 + 高さ100 の中央は 297。キャンバス中央 250 へ上端が 3 寄る
    const result = toCanvas(moving(300, 247))
    expect(result.y).toBe(250)
    expect(result.guidesY).toEqual([250])
  })

  it('吸着先が空でもキャンバスの線だけで動く', () => {
    expect(snapPosition(moving(2, 2), [], canvas, THRESHOLD)).toEqual({
      x: 0,
      y: 0,
      guidesX: [0],
      guidesY: [0],
    })
  })
})
