import { describe, expect, it } from 'vitest'
import { effectsBleed, effectsFilter } from '../src/lib/core/effects'
import { DEFAULT_EFFECTS, type Effects } from '../src/types'

const effects = (over: Partial<Effects>): Effects => ({ ...DEFAULT_EFFECTS, ...over })

describe('effectsFilter', () => {
  it('何も有効でなければ filter を付けない', () => {
    expect(effectsFilter(DEFAULT_EFFECTS)).toBeUndefined()
  })

  it('effects を持たない古いレイヤーでも落ちない', () => {
    expect(effectsFilter(undefined)).toBeUndefined()
  })

  it('ブラーは blur() になる', () => {
    expect(effectsFilter(effects({ blur: 4 }))).toBe('blur(4px)')
  })

  it('シャドウは色と濃さを rgba にまとめた drop-shadow になる', () => {
    const filter = effectsFilter(
      effects({
        shadowEnabled: true,
        shadowX: 3,
        shadowY: -2,
        shadowBlur: 0,
        shadowColor: '#25282D',
        shadowOpacity: 0.5,
      }),
    )
    expect(filter).toBe('drop-shadow(3px -2px 0px rgba(37, 40, 45, 0.5))')
  })

  it('光彩は薄すぎないよう同じ drop-shadow を重ねる', () => {
    const filter = effectsFilter(
      effects({ glowEnabled: true, glowBlur: 10, glowColor: '#FFFFFF', glowOpacity: 1 }),
    )
    const glow = 'drop-shadow(0 0 10px rgba(255, 255, 255, 1))'
    expect(filter).toBe([glow, glow, glow].join(' '))
  })

  it('ブラー・シャドウ・光彩はこの順に並ぶ', () => {
    const filter = effectsFilter(effects({ blur: 2, shadowEnabled: true, glowEnabled: true }))
    expect(filter?.indexOf('blur(')).toBe(0)
    expect(filter?.indexOf('drop-shadow(6px')).toBeLessThan(filter?.indexOf('drop-shadow(0 0') ?? 0)
  })
})

describe('effectsBleed', () => {
  it('ぼかしていなければはみ出させない', () => {
    expect(effectsBleed(DEFAULT_EFFECTS)).toBe(0)
    expect(effectsBleed(undefined)).toBe(0)
  })

  it('ぼかしの滲む分だけ外側に余白を取る', () => {
    expect(effectsBleed(effects({ blur: 10 }))).toBe(30)
  })
})
