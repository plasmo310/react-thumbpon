import { describe, expect, it } from 'vitest'
import { classifyWheel, wheelDeltaPx, type WheelInput } from '@/domain/canvasWheel'

/** 修飾なしの px 単位の wheel。各テストで必要な値だけ上書きする */
const wheel = (input: Partial<WheelInput>): WheelInput => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  ...input,
})

describe('classifyWheel', () => {
  it('ピンチ（ctrlKey 付き）はズームにする', () => {
    expect(classifyWheel(wheel({ deltaY: 1.5, ctrlKey: true }))).toBe('zoom')
  })

  it('Cmd を押しながらのスクロールはズームにする', () => {
    expect(classifyWheel(wheel({ deltaX: 3, deltaY: 2.5, metaKey: true }))).toBe('zoom')
  })

  it('行単位・ページ単位で来るものはマウスとしてズームにする', () => {
    expect(classifyWheel(wheel({ deltaY: 3, deltaMode: 1 }))).toBe('zoom')
    expect(classifyWheel(wheel({ deltaY: 1, deltaMode: 2 }))).toBe('zoom')
  })

  it('横成分があるものはトラックパッドとして移動にする', () => {
    expect(classifyWheel(wheel({ deltaX: 4, deltaY: 0 }))).toBe('pan')
  })

  it('縦が小数のものはトラックパッドとして移動にする', () => {
    expect(classifyWheel(wheel({ deltaY: 2.75 }))).toBe('pan')
  })

  it('縦だけ整数で来るものはマウスホイールとしてズームにする', () => {
    expect(classifyWheel(wheel({ deltaY: 100 }))).toBe('zoom')
  })
})

describe('wheelDeltaPx', () => {
  it('単位ごとに px へ換算する', () => {
    expect(wheelDeltaPx(10, 0)).toBe(10)
    expect(wheelDeltaPx(3, 1)).toBe(48)
    expect(wheelDeltaPx(1, 2)).toBe(400)
  })
})
