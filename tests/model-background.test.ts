import { describe, expect, it } from 'vitest'
import { backgroundArtStyle, backgroundBaseStyle } from '@/domain/background'
import { type Background, DEFAULT_BACKGROUND } from '@/domain/background'

const background = (over: Partial<Background>): Background => ({ ...DEFAULT_BACKGROUND, ...over })

describe('backgroundBaseStyle', () => {
  it('下地はいつでも色だけ。エフェクトを掛けない層なのでここに絵柄は入れない', () => {
    expect(backgroundBaseStyle(background({ type: 'image', color: '#123456' }))).toEqual({
      backgroundColor: '#123456',
    })
  })
})

describe('backgroundArtStyle', () => {
  it('単色は絵柄を持たない（下地色だけで描けるため）', () => {
    expect(backgroundArtStyle(background({ color: '#123456' }), null)).toEqual({})
  })

  it('画像は素材が未解決なら絵柄なしになる', () => {
    expect(backgroundArtStyle(background({ type: 'image' }), null)).toEqual({})
  })

  it('水玉は間隔と太さから円の半径を決める', () => {
    const style = backgroundArtStyle(
      background({ type: 'pattern', pattern: 'dots', patternSize: 40, patternWeight: 0.5 }),
      null,
    )
    expect(style.backgroundImage).toContain('10px')
    expect(style.backgroundSize).toBe('40px 40px')
  })

  it('ラインは角度を反映する', () => {
    const style = backgroundArtStyle(
      background({ type: 'pattern', pattern: 'lines', patternAngle: 90 }),
      null,
    )
    expect(style.backgroundImage).toContain('repeating-linear-gradient(90deg')
  })

  it('チェックは半マスずらした2枚を重ねる', () => {
    const style = backgroundArtStyle(
      background({ type: 'pattern', pattern: 'checker', patternSize: 32 }),
      null,
    )
    expect(style.backgroundPosition).toBe('0 0, 16px 16px')
  })

  it('画像は cover / contain なら1枚だけ敷く', () => {
    const style = backgroundArtStyle(background({ type: 'image', fit: 'contain' }), 'blob:x')
    expect(style.backgroundSize).toBe('contain')
    expect(style.backgroundRepeat).toBe('no-repeat')
  })

  it('画像はタイルならタイル幅で繰り返す。高さは元の比率に任せる', () => {
    const style = backgroundArtStyle(
      background({ type: 'image', fit: 'tile', tileWidth: 80 }),
      'blob:x',
    )
    expect(style.backgroundImage).toBe('url(blob:x)')
    expect(style.backgroundSize).toBe('80px auto')
    expect(style.backgroundRepeat).toBe('repeat')
  })

  it('模様の設定を持たない古い背景でも既定値で描ける', () => {
    const legacy = { type: 'pattern', color: '#FFFFFF' } as unknown as Background
    expect(backgroundArtStyle(legacy, null).backgroundImage).toContain('radial-gradient')
  })

  it('知らない模様が入っていても水玉として描く', () => {
    const stale = {
      ...DEFAULT_BACKGROUND,
      type: 'pattern',
      pattern: 'tile',
    } as unknown as Background
    expect(backgroundArtStyle(stale, null).backgroundImage).toContain('radial-gradient')
  })
})
