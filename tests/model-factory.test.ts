import { describe, expect, it } from 'vitest'
import { createId } from '@/domain/id'
import {
  cloneLayer,
  createImageLayer,
  createTextLayer,
  extractTextStyle,
  imageFrameStyle,
} from '@/domain/layer'
import { DEFAULT_CROP } from '@/domain/crop'
import { DEFAULT_CANVAS, cloneThumbnail, createThumbnail } from '@/domain/thumbnail'
import { TEXT_STYLE_KEYS, type TextLayer } from '@/domain/layer'
import { CANVAS_PRESETS } from '@/domain/thumbnail'

describe('createId', () => {
  it('呼ぶたびに違う id を返す', () => {
    const ids = new Set(Array.from({ length: 100 }, createId))
    expect(ids.size).toBe(100)
  })
})

describe('DEFAULT_CANVAS', () => {
  it('プリセットの先頭を正とする', () => {
    expect(DEFAULT_CANVAS).toEqual({
      width: CANVAS_PRESETS[0].width,
      height: CANVAS_PRESETS[0].height,
    })
  })
})

describe('createThumbnail', () => {
  it('レイヤーは空、既定は未分類', () => {
    const thumbnail = createThumbnail('サムネイル 1')
    expect(thumbnail.layers).toEqual([])
    expect(thumbnail.folderId).toBeNull()
    expect(thumbnail.canvas).toEqual(DEFAULT_CANVAS)
  })

  it('渡したキャンバスを複製して持つ（あとから共有されない）', () => {
    const canvas = { width: 640, height: 480 }
    const thumbnail = createThumbnail('t', null, canvas)
    canvas.width = 1
    expect(thumbnail.canvas).toEqual({ width: 640, height: 480 })
  })
})

describe('cloneThumbnail', () => {
  it('サムネイルとレイヤーの id を振り直す', () => {
    const source = createThumbnail('元')
    source.layers = [createTextLayer(DEFAULT_CANVAS), createTextLayer(DEFAULT_CANVAS)]

    const copy = cloneThumbnail(source, '写し')

    expect(copy.name).toBe('写し')
    expect(copy.id).not.toBe(source.id)
    expect(copy.layers.map((l) => l.id)).not.toEqual(source.layers.map((l) => l.id))
    expect(new Set(copy.layers.map((l) => l.id)).size).toBe(2)
  })

  it('複製後の編集が元へ波及しない', () => {
    const source = createThumbnail('元')
    source.layers = [createTextLayer(DEFAULT_CANVAS)]

    const copy = cloneThumbnail(source, '写し')
    copy.canvas.width = 1
    copy.background.color = '#000000'
    copy.layers[0].effects.blur = 99
    copy.layers[0].x = 999

    expect(source.canvas.width).not.toBe(1)
    expect(source.background.color).not.toBe('#000000')
    expect(source.layers[0].effects.blur).not.toBe(99)
    expect(source.layers[0].x).not.toBe(999)
  })

  it('folderId は引き継ぐ（貼り付け先の変更は呼び出し側の責任）', () => {
    const source = createThumbnail('元', 'folder-1')
    expect(cloneThumbnail(source, '写し').folderId).toBe('folder-1')
  })
})

describe('createImageLayer', () => {
  it('渡した矩形をそのまま使う', () => {
    const layer = createImageLayer('character.png', 'asset-1', {
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    })
    expect(layer).toMatchObject({
      type: 'image',
      name: 'character.png',
      assetId: 'asset-1',
      x: 10,
      y: 20,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      crop: DEFAULT_CROP,
      flipX: false,
    })
  })
})

describe('imageFrameStyle', () => {
  const layer = () => createImageLayer('a.png', 'asset-1', { x: 0, y: 0, width: 100, height: 100 })

  it('枠いっぱいに広げる', () => {
    expect(imageFrameStyle(layer())).toMatchObject({ position: 'absolute', inset: 0 })
  })

  it('反転は中身の層にだけ掛ける（影の向きまで反転させないため）', () => {
    expect(imageFrameStyle(layer()).transform).toBeUndefined()
    expect(imageFrameStyle({ ...layer(), flipX: true }).transform).toBe('scaleX(-1)')
  })
})

describe('createTextLayer', () => {
  it('キャンバスに対する比率で幅と文字サイズを決め、中央に置く', () => {
    const canvas = { width: 1000, height: 500 }
    const layer = createTextLayer(canvas)

    expect(layer.width).toBe(600) // 幅の 60%
    expect(layer.fontSize).toBe(45) // 高さの 9%
    expect(layer.x).toBe(200) // (1000 - 600) / 2
    expect(layer.y).toBe(205) // 500/2 - 45
  })

  it('height は持たない（内容に応じて伸びるため）', () => {
    expect('height' in createTextLayer(DEFAULT_CANVAS)).toBe(false)
  })
})

describe('cloneLayer', () => {
  it('id を振り直し、重ならないようずらす', () => {
    const source = createTextLayer(DEFAULT_CANVAS)
    const copy = cloneLayer(source)

    expect(copy.id).not.toBe(source.id)
    expect(copy.name).toBe(`${source.name} のコピー`)
    expect(copy.x).toBe(source.x + 24)
    expect(copy.y).toBe(source.y + 24)
  })

  it('effects は複製されるので元へ波及しない', () => {
    const source = createTextLayer(DEFAULT_CANVAS)
    const copy = cloneLayer(source)
    copy.effects.blur = 42
    expect(source.effects.blur).not.toBe(42)
  })
})

describe('extractTextStyle', () => {
  it('TEXT_STYLE_KEYS の項目だけを取り出す', () => {
    const layer = createTextLayer(DEFAULT_CANVAS)
    const style = extractTextStyle(layer)

    expect(Object.keys(style).sort()).toEqual([...TEXT_STYLE_KEYS].sort())
    for (const key of TEXT_STYLE_KEYS) {
      expect(style[key]).toBe(layer[key as keyof TextLayer])
    }
  })

  it('位置や内容は含めない（プリセットは見た目だけを持つ）', () => {
    const style = extractTextStyle(createTextLayer(DEFAULT_CANVAS)) as Record<string, unknown>
    expect(style.x).toBeUndefined()
    expect(style.text).toBeUndefined()
    expect(style.id).toBeUndefined()
  })
})
