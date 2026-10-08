import { describe, expect, it } from 'vitest'
import {
  normalizeFamily,
  parseUnicodeRange,
  rangesContainAny,
  selectFontFaces,
  type FontFaceInfo,
  type FontUsage,
} from '@/domain/fontSubset'

const face = (over: Partial<FontFaceInfo> = {}): FontFaceInfo => ({
  family: '"Noto Sans JP"',
  weight: '400',
  unicodeRange: '',
  cssText: '',
  ...over,
})

const usage = (text: string, families = ['"Noto Sans JP"', 'sans-serif'], weights = ['400']) =>
  ({
    families: new Set(families),
    weights: new Set(weights),
    codePoints: new Set([...text].map((c) => c.codePointAt(0)!)),
  }) satisfies FontUsage

describe('normalizeFamily', () => {
  it('引用符・前後の空白・大文字小文字の違いを無視する', () => {
    expect(normalizeFamily(' "Noto Sans JP"')).toBe(normalizeFamily("'noto sans jp'"))
  })
})

describe('parseUnicodeRange', () => {
  it('単一値・範囲・ワイルドカードを読み、空白を許す', () => {
    expect(parseUnicodeRange('U+3000-303F, U+FF01,U+4??')).toEqual([
      [0x3000, 0x303f],
      [0xff01, 0xff01],
      [0x400, 0x4ff],
    ])
  })

  it('空や解釈できない項目は範囲にしない', () => {
    expect(parseUnicodeRange('')).toEqual([])
    expect(parseUnicodeRange('foo')).toEqual([])
  })
})

describe('rangesContainAny', () => {
  it('範囲の端を含めて判定する', () => {
    expect(rangesContainAny([[0x3000, 0x303f]], new Set([0x303f]))).toBe(true)
    expect(rangesContainAny([[0x3000, 0x303f]], new Set([0x3040]))).toBe(false)
  })
})

describe('selectFontFaces', () => {
  const hira = face({ unicodeRange: 'U+3041-3096', cssText: 'hira' })
  const latin = face({ unicodeRange: 'U+0000-00FF', cssText: 'latin' })

  it('使っている文字を含む範囲の書体だけを選ぶ', () => {
    expect(selectFontFaces([hira, latin], usage('あい'))).toEqual([hira])
  })

  it('使っていない書体は選ばない', () => {
    const roboto = face({ family: 'Roboto', unicodeRange: 'U+0000-00FF' })
    expect(selectFontFaces([roboto, latin], usage('a'))).toEqual([latin])
  })

  it('使っている太さだけを選ぶ', () => {
    const bold = face({ weight: '700', unicodeRange: 'U+3041-3096', cssText: 'bold' })
    expect(selectFontFaces([hira, bold], usage('あ', undefined, ['700']))).toEqual([bold])
  })

  it('使っている太さが無ければ、その書体の全部の太さを残す', () => {
    const bold = face({ weight: '700', unicodeRange: 'U+3041-3096', cssText: 'bold' })
    expect(selectFontFaces([hira, bold], usage('あ', undefined, ['500']))).toEqual([hira, bold])
  })

  it('可変フォントの太さの範囲を受け持つものとして扱う', () => {
    const variable = face({ weight: '100 900', unicodeRange: 'U+3041-3096' })
    expect(selectFontFaces([variable], usage('あ', undefined, ['700']))).toEqual([variable])
  })

  it('unicode-range の指定が無ければ常に選ぶ', () => {
    const whole = face({ cssText: 'whole' })
    expect(selectFontFaces([whole], usage('漢'))).toEqual([whole])
  })
})
