import { describe, expect, it } from 'vitest'
import {
  createTextLayer,
  extractTextStyle,
  normalizeTextBackground,
  textFrameStyle,
} from '@/domain/layer'
import { normalizeThumbnails } from '@/domain/project'
import { createThumbnail } from '@/domain/thumbnail'

describe('テキスト背景の個別角丸', () => {
  it('新規は全体指定で四隅も0', () => {
    const layer = createTextLayer({ width: 1280, height: 720 })
    expect(layer).toMatchObject({
      backgroundRadiusMode: 'uniform',
      backgroundRadius: 0,
      backgroundRadiusTopLeft: 0,
      backgroundRadiusTopRight: 0,
      backgroundRadiusBottomLeft: 0,
      backgroundRadiusBottomRight: 0,
    })
  })

  it('旧データの角丸を引き継ぎ、個別に指定された0は上書きしない', () => {
    expect(
      normalizeTextBackground({ backgroundRadius: 18, backgroundRadiusTopLeft: 0 }),
    ).toMatchObject({
      backgroundRadiusMode: 'uniform',
      backgroundRadius: 18,
      backgroundRadiusTopLeft: 0,
      backgroundRadiusTopRight: 18,
      backgroundRadiusBottomLeft: 18,
      backgroundRadiusBottomRight: 18,
    })
  })

  it('四隅をCSSの左上・右上・右下・左下の順で描画する', () => {
    const layer = {
      ...createTextLayer({ width: 1280, height: 720 }),
      backgroundEnabled: true,
      backgroundRadiusMode: 'individual' as const,
      backgroundRadius: 20,
      backgroundRadiusTopLeft: 1,
      backgroundRadiusTopRight: 2,
      backgroundRadiusBottomLeft: 3,
      backgroundRadiusBottomRight: 4,
    }
    expect(textFrameStyle(layer).borderRadius).toBe('1px 2px 4px 3px')
    expect(textFrameStyle({ ...layer, backgroundRadiusMode: 'uniform' }).borderRadius).toBe(20)
    expect(textFrameStyle({ ...layer, backgroundEnabled: false }).borderRadius).toBeUndefined()
  })

  it('プロジェクト復元で旧角丸を補完し、プリセットに四隅とモードを含める', () => {
    const {
      backgroundRadiusMode,
      backgroundRadiusTopLeft,
      backgroundRadiusTopRight,
      backgroundRadiusBottomLeft,
      backgroundRadiusBottomRight,
      ...old
    } = createTextLayer({ width: 1280, height: 720 })
    const thumbnail = createThumbnail('legacy')
    thumbnail.layers = [{ ...old, backgroundRadius: 12 } as ReturnType<typeof createTextLayer>]
    const layer = normalizeThumbnails([thumbnail])[0].layers[0]
    if (layer.type !== 'text') throw new Error('テキストではない')
    expect(extractTextStyle(layer)).toMatchObject({
      backgroundRadiusMode: 'uniform',
      backgroundRadius: 12,
      backgroundRadiusTopLeft: 12,
      backgroundRadiusTopRight: 12,
      backgroundRadiusBottomLeft: 12,
      backgroundRadiusBottomRight: 12,
    })
  })
})
