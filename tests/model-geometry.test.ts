import { describe, expect, it } from 'vitest'
import {
  HANDLES,
  MIN_SIZE,
  angleFromCenter,
  clamp,
  fitInto,
  isCornerHandle,
  normalizeAngle,
  resizeRect,
  rotateVector,
  snapAngle,
  type Handle,
  type Rect,
} from '@/domain/geometry'

/** 幅100 × 高さ50 を原点に置いたもの。比率2:1 なのでアスペクト維持の確認に使える */
const start: Rect = { x: 0, y: 0, width: 100, height: 50 }

describe('resizeRect', () => {
  it('se を引くと右下が伸び、対角の左上は動かない', () => {
    expect(resizeRect(start, 0, 'se', 10, 20, false)).toEqual({
      x: 0,
      y: 0,
      width: 110,
      height: 70,
    })
  })

  it('nw を引くと左上が縮み、対角の右下は動かない', () => {
    const rect = resizeRect(start, 0, 'nw', 10, 10, false)
    expect(rect).toEqual({ x: 10, y: 10, width: 90, height: 40 })
    // 右下＝アンカーなので開始時と同じ位置に残る
    expect(rect.x + rect.width).toBe(start.x + start.width)
    expect(rect.y + rect.height).toBe(start.y + start.height)
  })

  it('辺のハンドルは片方の軸しか変えない', () => {
    // e は縦の移動量を無視する
    expect(resizeRect(start, 0, 'e', 20, 999, false)).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 50,
    })
    // n は横の移動量を無視し、上へ伸ばした分だけ y が上がる
    expect(resizeRect(start, 0, 'n', 999, -10, false)).toEqual({
      x: 0,
      y: -10,
      width: 100,
      height: 60,
    })
  })

  it('潰しすぎても MIN_SIZE で止まり、アンカーは動かない', () => {
    expect(resizeRect(start, 0, 'se', -500, -500, false)).toEqual({
      x: 0,
      y: 0,
      width: MIN_SIZE,
      height: MIN_SIZE,
    })
  })

  it('角ハンドルで縦横比を維持すると、動かした量の大きい方に合わせる', () => {
    // 縦に動かしていなくても、比率2:1 を保って高さが付いてくる
    expect(resizeRect(start, 0, 'se', 20, 0, true)).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 60,
    })
  })

  it('辺のハンドルでは縦横比の維持は効かない', () => {
    expect(resizeRect(start, 0, 'e', 20, 20, true)).toEqual({
      x: 0,
      y: 0,
      width: 120,
      height: 50,
    })
  })

  it('回転していると、画面の移動量はレイヤーのローカル軸に読み替えられる', () => {
    // 90度回っているレイヤーの se を画面の下方向へ引くと、伸びるのは「幅」
    const rect = resizeRect(start, 90, 'se', 0, 10, false)
    expect(rect.width).toBeCloseTo(110)
    expect(rect.height).toBeCloseTo(50)
    // 中心は画面下へ動くので、左上は左と下へずれる
    expect(rect.x).toBeCloseTo(-5)
    expect(rect.y).toBeCloseTo(5)
  })
})

describe('rotateVector', () => {
  it('90度回すと X が Y になる', () => {
    const [x, y] = rotateVector(10, 0, 90)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(10)
  })

  it('負の角度で逆回転する', () => {
    const [x, y] = rotateVector(0, 10, -90)
    expect(x).toBeCloseTo(10)
    expect(y).toBeCloseTo(0)
  })
})

describe('isCornerHandle', () => {
  it('名前が2文字のものだけが角', () => {
    const corners: Handle[] = ['nw', 'ne', 'se', 'sw']
    const sides: Handle[] = ['n', 'e', 's', 'w']
    expect(corners.every(isCornerHandle)).toBe(true)
    expect(sides.some(isCornerHandle)).toBe(false)
  })

  it('HANDLES は角4つと辺4つで構成される', () => {
    expect(HANDLES.filter(isCornerHandle)).toHaveLength(4)
    expect(HANDLES).toHaveLength(8)
  })
})

describe('angleFromCenter', () => {
  it('上が0度、時計回りが正', () => {
    expect(angleFromCenter(0, 0, 0, -10)).toBeCloseTo(0)
    expect(angleFromCenter(0, 0, 10, 0)).toBeCloseTo(90)
    expect(angleFromCenter(0, 0, 0, 10)).toBeCloseTo(180)
    expect(angleFromCenter(0, 0, -10, 0)).toBeCloseTo(-90)
  })
})

describe('snapAngle', () => {
  it('既定では15度刻みに丸める', () => {
    expect(snapAngle(7)).toBe(0)
    expect(snapAngle(8)).toBe(15)
    expect(snapAngle(-8)).toBe(-15)
  })

  it('刻み幅を指定できる', () => {
    expect(snapAngle(44, 90)).toBe(0)
    expect(snapAngle(46, 90)).toBe(90)
  })
})

describe('normalizeAngle', () => {
  it('0..360 に収める', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(370)).toBe(10)
    expect(normalizeAngle(-10)).toBe(350)
    expect(normalizeAngle(-370)).toBe(350)
  })

  it('360 は 0 になる', () => {
    expect(normalizeAngle(360)).toBe(0)
  })
})

describe('clamp', () => {
  it('範囲内に収める', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('fitInto', () => {
  it('枠に収まるよう縮める', () => {
    expect(fitInto(200, 100, 100, 100)).toEqual({ width: 100, height: 50 })
  })

  it('枠より小さいものは拡大しない', () => {
    expect(fitInto(50, 50, 100, 100)).toEqual({ width: 50, height: 50 })
  })

  it('縦が先に当たる場合は縦に合わせる', () => {
    expect(fitInto(100, 200, 100, 100)).toEqual({ width: 50, height: 100 })
  })
})
