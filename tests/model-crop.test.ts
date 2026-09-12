import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CROP,
  MAX_CROP,
  cropByHandle,
  cropImageStyle,
  croppedRatio,
  isCropped,
  mergeCrop,
  type Crop,
} from '@/domain/crop'

const crop = (over: Partial<Crop> = {}): Crop => ({ ...DEFAULT_CROP, ...over })

/** 200×100 の枠。クロップは割合なので、実寸への換算はこの枠が基準になる */
const rect = { x: 0, y: 0, width: 200, height: 100 }

describe('isCropped', () => {
  it('どこも切っていなければ false', () => {
    expect(isCropped(DEFAULT_CROP)).toBe(false)
  })

  it('1辺でも切っていれば true', () => {
    expect(isCropped(crop({ right: 0.1 }))).toBe(true)
  })
})

describe('mergeCrop', () => {
  it('指定した辺だけを変える', () => {
    expect(mergeCrop(crop({ left: 0.2 }), { top: 0.3 })).toEqual(crop({ left: 0.2, top: 0.3 }))
  })

  it('負の値は 0 で止める', () => {
    expect(mergeCrop(DEFAULT_CROP, { top: -1 }).top).toBe(0)
  })

  it('反対側の辺と合わせて画像が消えないところで止める', () => {
    const merged = mergeCrop(crop({ bottom: 0.5 }), { top: 0.9 })
    expect(merged.top).toBeCloseTo(MAX_CROP - 0.5)
    // 据え置いた側は動かさない
    expect(merged.bottom).toBe(0.5)
  })

  it('クロップを持たない古いレイヤー由来の値でも既定値で埋める', () => {
    expect(mergeCrop({} as Crop, { left: 0.1 })).toEqual(crop({ left: 0.1 }))
  })
})

describe('cropImageStyle', () => {
  it('切っていなければ枠いっぱいに置く', () => {
    expect(cropImageStyle(DEFAULT_CROP)).toMatchObject({
      left: '0%',
      top: '0%',
      width: '100%',
      height: '100%',
    })
  })

  it('切った分だけ画像を大きくして、切った側へずらす', () => {
    // 左右を25%ずつ落とすと、見えるのは元画像の半分。枠に対して画像は2倍になる
    const style = cropImageStyle(crop({ left: 0.25, right: 0.25 }))
    expect(style.width).toBe('200%')
    expect(style.left).toBe('-50%')
  })
})

describe('cropByHandle', () => {
  it('左端を内側へ動かすと、枠が詰まって画像の位置は変わらない', () => {
    const { rect: next, crop: cropped } = cropByHandle(rect, DEFAULT_CROP, 0, 'w', 50, 0)
    // 右端は動かず、左端だけが 50px 入る
    expect(next.x).toBe(50)
    expect(next.width).toBe(150)
    expect(next.x + next.width).toBe(rect.x + rect.width)
    // 50px は元画像の 1/4 なので、左から 25% を落としたことになる
    expect(cropped.left).toBeCloseTo(0.25)
    expect(cropped.right).toBe(0)
  })

  it('詰めた端を戻すと元の画像の端までで止まる', () => {
    const from = crop({ left: 0.25 })
    const start = { ...rect, x: 50, width: 150 }
    // 左端をどれだけ外へ引いても、切り落とした 50px ぶんしか戻らない
    const { rect: next, crop: cropped } = cropByHandle(start, from, 0, 'w', -999, 0)
    expect(next.x).toBe(0)
    expect(next.width).toBe(200)
    expect(cropped.left).toBeCloseTo(0)
  })

  it('切っていない側へは広がらない', () => {
    const { rect: next, crop: cropped } = cropByHandle(rect, DEFAULT_CROP, 0, 'e', 80, 0)
    expect(next.width).toBe(rect.width)
    expect(cropped.right).toBe(0)
  })

  it('角のハンドルは縦横を同時に詰める', () => {
    const { rect: next, crop: cropped } = cropByHandle(rect, DEFAULT_CROP, 0, 'se', -100, -50)
    expect(next.width).toBe(100)
    expect(next.height).toBe(50)
    expect(cropped.right).toBeCloseTo(0.5)
    expect(cropped.bottom).toBeCloseTo(0.5)
  })

  it('回転していても、掴んだ辺は見た目どおりに動く', () => {
    // 90度回した状態で画面の下方向へ引くと、レイヤーの左辺を内側へ動かしたことになる
    const { crop: cropped } = cropByHandle(rect, DEFAULT_CROP, 90, 'w', 0, 50)
    expect(cropped.left).toBeCloseTo(0.25)
  })

  it('枠を掴める大きさより小さくは詰められない', () => {
    const { rect: next } = cropByHandle(rect, DEFAULT_CROP, 0, 'w', 999, 0)
    expect(next.width).toBe(8)
  })
})

describe('croppedRatio', () => {
  it('切ったあとに見えている部分の縦横比を返す', () => {
    expect(croppedRatio({ width: 100, height: 100 }, DEFAULT_CROP)).toBe(1)
    // 上下を合わせて半分落とすと、見えている部分は横長になる
    expect(croppedRatio({ width: 100, height: 100 }, crop({ top: 0.25, bottom: 0.25 }))).toBe(2)
  })
})
