import { describe, expect, it } from 'vitest'
import {
  assetPath,
  collectUsedFonts,
  extensionFor,
  findMissingFonts,
} from '../src/lib/core/project'
import type { AssetMeta, FontEntry, TextLayer, Thumbnail } from '../src/types'

const meta = (over: Partial<AssetMeta>): AssetMeta => ({
  id: 'a1',
  name: 'sample.png',
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
  ...over,
})

const textLayer = (fontFamily: string): TextLayer => ({
  id: `t-${fontFamily}`,
  name: 'text',
  type: 'text',
  x: 0,
  y: 0,
  width: 100,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  text: 'あ',
  fontFamily,
  fontSize: 40,
  fontWeight: 400,
  fontStyle: 'normal',
  textAlign: 'left',
  letterSpacing: 0,
  lineHeight: 1.2,
  color: '#000',
  strokeWidth: 0,
  strokeColor: '#fff',
})

const thumbnail = (layers: Thumbnail['layers']): Thumbnail => ({
  id: 'th1',
  name: 'サムネイル 1',
  folderId: null,
  canvas: { width: 1920, height: 1080 },
  background: { type: 'color', color: '#fff' } as Thumbnail['background'],
  layers,
})

const fonts: FontEntry[] = [
  { id: 'noto', family: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP', source: 'builtin' },
  { id: 'file:Mine', family: '"Mine"', label: 'Mine', source: 'file' },
  { id: 'local:Meiryo', family: '"Meiryo"', label: 'Meiryo', source: 'local' },
]

describe('extensionFor', () => {
  it('mime から拡張子を決める', () => {
    expect(extensionFor(meta({ mime: 'image/jpeg' }))).toBe('.jpg')
    expect(extensionFor(meta({ mime: 'image/webp' }))).toBe('.webp')
  })

  it('mime が未知ならファイル名の末尾を使う', () => {
    expect(extensionFor(meta({ mime: 'application/octet-stream', name: 'x.avif' }))).toBe('.avif')
  })

  it('どちらも分からなければ .bin にする', () => {
    expect(extensionFor(meta({ mime: 'application/octet-stream', name: 'noext' }))).toBe('.bin')
  })
})

describe('assetPath', () => {
  it('assets/ 直下に id + 拡張子で置く', () => {
    expect(assetPath(meta({ id: 'abc' }))).toBe('assets/abc.png')
  })
})

describe('collectUsedFonts', () => {
  it('実際に使われている非 builtin のフォントだけを集める', () => {
    const used = collectUsedFonts([thumbnail([textLayer('"Mine"')])], fonts)
    expect(used).toEqual([{ label: 'Mine', family: '"Mine"', source: 'file' }])
  })

  it('builtin はどの環境でも出るので含めない', () => {
    const used = collectUsedFonts([thumbnail([textLayer('"Noto Sans JP", sans-serif')])], fonts)
    expect(used).toEqual([])
  })

  it('同じ family が複数レイヤーにあっても1つにまとめる', () => {
    const th = thumbnail([textLayer('"Mine"'), { ...textLayer('"Mine"'), id: 't2' }])
    expect(collectUsedFonts([th], fonts)).toHaveLength(1)
  })

  it('一覧に無い family は拾わない（逆引きできず表示名も作れないため）', () => {
    expect(collectUsedFonts([thumbnail([textLayer('"Unknown"')])], fonts)).toEqual([])
  })

  it('すべてのサムネイルを横断して集める', () => {
    const used = collectUsedFonts(
      [thumbnail([textLayer('"Mine"')]), { ...thumbnail([textLayer('"Meiryo"')]), id: 'th2' }],
      fonts,
    )
    expect(used.map((f) => f.label).sort()).toEqual(['Meiryo', 'Mine'])
  })
})

describe('findMissingFonts', () => {
  it('現在の一覧に family が無いものを表示名で返す', () => {
    const required = [
      { label: 'Mine', family: '"Mine"', source: 'file' as const },
      { label: 'Gone', family: '"Gone"', source: 'file' as const },
    ]
    expect(findMissingFonts(required, fonts)).toEqual(['Gone'])
  })

  it('fonts を持たない旧形式では何も告知しない', () => {
    expect(findMissingFonts(undefined, fonts)).toEqual([])
  })
})
