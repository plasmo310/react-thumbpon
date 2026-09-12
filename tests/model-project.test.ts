import { describe, expect, it } from 'vitest'
import {
  assetFolderDirName,
  assetPath,
  collectUsedFonts,
  defaultManifestName,
  extensionFor,
  findManifestEntry,
  findManifestName,
  findMissingFonts,
  normalizeThumbnails,
  sanitizePathName,
} from '@/domain/project'
import type { AssetFolder, AssetMeta } from '@/domain/asset'
import { DEFAULT_BACKGROUND } from '@/domain/background'
import { DEFAULT_CROP } from '@/domain/crop'
import { DEFAULT_EFFECTS } from '@/domain/effects'
import type { FontEntry } from '@/domain/font'
import type { ImageLayer, TextLayer } from '@/domain/layer'
import type { Thumbnail } from '@/domain/thumbnail'

const meta = (over: Partial<AssetMeta>): AssetMeta => ({
  id: 'a1',
  name: 'sample.png',
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
  folderId: null,
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
  effects: DEFAULT_EFFECTS,
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

const folder = (id: string, name: string): AssetFolder => ({ id, name, collapsed: false })

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

describe('sanitizePathName', () => {
  it('OS が受け付けない文字を落とす', () => {
    expect(sanitizePathName('a/b:c*d?e"f<g>h|i\j')).toBe('abcdefghij')
  })

  it('前後の空白とドットを落とす（Windows で作れない名前になるため）', () => {
    expect(sanitizePathName('  ..風景.  ')).toBe('風景')
  })

  it('使える文字が残らなければ空になる（代替名は呼び出し側の責任）', () => {
    expect(sanitizePathName('///')).toBe('')
  })
})

describe('assetFolderDirName', () => {
  it('名前をそのままフォルダ名に使う', () => {
    expect(assetFolderDirName(folder('f1', '背景 素材'))).toBe('背景 素材')
  })

  it('名前が使えない文字だけなら id で代替する', () => {
    expect(assetFolderDirName(folder('f1', '??'))).toBe('f1')
  })
})

describe('assetPath', () => {
  it('未分類は assets/ 直下に id + 拡張子で置く', () => {
    expect(assetPath(meta({ id: 'abc' }))).toBe('assets/abc.png')
  })

  it('フォルダに入っているものはフォルダ名で分ける', () => {
    const folders = [folder('f1', '風景')]
    expect(assetPath(meta({ id: 'abc', folderId: 'f1' }), folders)).toBe('assets/風景/abc.png')
  })

  it('無くなったフォルダを指していたら assets/ 直下に戻す', () => {
    expect(assetPath(meta({ id: 'abc', folderId: 'gone' }), [folder('f1', '風景')])).toBe(
      'assets/abc.png',
    )
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

describe('normalizeThumbnails', () => {
  it('模様の設定を持たない背景を既定値で補う', () => {
    const [normalized] = normalizeThumbnails([thumbnail([])])
    expect(normalized.background.pattern).toBe(DEFAULT_BACKGROUND.pattern)
    expect(normalized.background.patternSize).toBe(DEFAULT_BACKGROUND.patternSize)
    // 元から入っていた値は上書きしない
    expect(normalized.background.color).toBe('#fff')
  })

  it('エフェクトを持たないレイヤーを既定値で補う', () => {
    const legacy = { ...textLayer('"Mine"') } as Partial<TextLayer>
    delete legacy.effects
    const [normalized] = normalizeThumbnails([thumbnail([legacy as TextLayer])])
    expect(normalized.layers[0].effects).toEqual(DEFAULT_EFFECTS)
  })

  it('設定済みのエフェクトはそのまま残す', () => {
    const layer = { ...textLayer('"Mine"'), effects: { ...DEFAULT_EFFECTS, blur: 8 } }
    const [normalized] = normalizeThumbnails([thumbnail([layer])])
    expect(normalized.layers[0].effects.blur).toBe(8)
  })

  it('クロップと左右反転を持たない画像レイヤーを既定値で補う', () => {
    const legacy = {
      id: 'im1',
      name: 'image',
      type: 'image',
      assetId: 'a1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      effects: DEFAULT_EFFECTS,
    } as ImageLayer
    const [normalized] = normalizeThumbnails([thumbnail([legacy])])
    expect(normalized.layers[0] as ImageLayer).toMatchObject({
      crop: DEFAULT_CROP,
      flipX: false,
    })
  })
})

describe('findManifestName', () => {
  it('*.thumbpon を拾う', () => {
    expect(findManifestName(['readme.txt', 'work.thumbpon', 'assets'])).toBe('work.thumbpon')
  })

  it('1つも無ければ null', () => {
    expect(findManifestName(['readme.txt', 'project.json'])).toBeNull()
  })

  it('1ファイル形式(.thumbpon.zip)は拾わない', () => {
    expect(findManifestName(['work.thumbpon.zip'])).toBeNull()
  })

  it('語幹の無い .thumbpon は拾わない', () => {
    // Unix では隠しファイルになる名前なので、プロジェクトとして扱わない
    expect(findManifestName(['.thumbpon'])).toBeNull()
  })

  it('複数あっても選び先がぶれない', () => {
    const names = ['bbb.thumbpon', 'aaa.thumbpon', 'a.thumbpon']
    expect(findManifestName(names)).toBe('a.thumbpon')
    expect(findManifestName([...names].reverse())).toBe('a.thumbpon')
  })
})

describe('findManifestEntry', () => {
  it('直下のマニフェストは接頭辞が空', () => {
    expect(findManifestEntry(['work.thumbpon', 'assets/a1.png'])).toEqual({
      path: 'work.thumbpon',
      prefix: '',
    })
  })

  it('フォルダごと圧縮された ZIP では、そのフォルダが接頭辞になる', () => {
    expect(findManifestEntry(['work/夜景.thumbpon', 'work/assets/a1.png'])).toEqual({
      path: 'work/夜景.thumbpon',
      prefix: 'work/',
    })
  })

  it('浅いほうを優先する', () => {
    const paths = ['work/a.thumbpon', 'outer.thumbpon']
    expect(findManifestEntry(paths)?.path).toBe('outer.thumbpon')
  })

  it('無ければ null', () => {
    expect(findManifestEntry(['readme.txt'])).toBeNull()
  })
})

describe('defaultManifestName', () => {
  it('フォルダ名から作る', () => {
    expect(defaultManifestName('夜景シリーズ')).toBe('夜景シリーズ.thumbpon')
  })

  it('使えない文字は落とす', () => {
    expect(defaultManifestName('a/b:c')).toBe('abc.thumbpon')
  })

  it('使える文字が残らなければ project にする', () => {
    expect(defaultManifestName('///')).toBe('project.thumbpon')
  })
})
