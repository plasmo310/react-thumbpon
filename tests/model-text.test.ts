import { describe, expect, it } from 'vitest'
import { createTextLayer, copyLayer } from '@/domain/layer'
import {
  formatTextRange,
  formatWholeText,
  inlineTextCss,
  insertionStyle,
  normalizeInlineStyles,
  normalizeTextRange,
  reconcileText,
  replaceTextRange,
  textSegments,
} from '@/domain/text'
import { collectUsedFonts, normalizeThumbnails } from '@/domain/project'
import { createThumbnail } from '@/domain/thumbnail'
import type { TextContent } from '@/domain/text'

const content: TextContent = {
  text: 'これが最強の方法',
  inlineStyles: [{ start: 3, end: 5, style: { color: '#FF0000', fontSize: 120 } }],
}

describe('部分書式', () => {
  it('通常部分も含めて連続区間に分ける', () => {
    expect(textSegments(content).map((r) => content.text.slice(r.start, r.end))).toEqual([
      'これが',
      '最強',
      'の方法',
    ])
  })
  it('範囲をまたぐ変更では既存の書式を保持し、同じ指定は結合する', () => {
    const result = formatTextRange(content, { start: 2, end: 6 }, { fontWeight: 900 })
    expect(result.inlineStyles).toEqual([
      { start: 2, end: 3, style: { fontWeight: 900 } },
      { start: 3, end: 5, style: { color: '#FF0000', fontSize: 120, fontWeight: 900 } },
      { start: 5, end: 6, style: { fontWeight: 900 } },
    ])
    const merged = formatTextRange(
      result,
      { start: 2, end: 6 },
      { color: '#FF0000', fontSize: 120 },
    )
    expect(merged.inlineStyles).toHaveLength(1)
    expect(content.inlineStyles).toHaveLength(1)
  })
  it('書式解除は選択した文字だけに適用する', () => {
    expect(formatTextRange(content, { start: 4, end: 6 }, null).inlineStyles).toEqual([
      { start: 3, end: 4, style: { color: '#FF0000', fontSize: 120 } },
    ])
  })
  it('挿入と削除で後続の書式範囲をずらす', () => {
    const inserted = replaceTextRange(content, { start: 0, end: 0 }, '本当に')
    expect(inserted.text).toBe('本当にこれが最強の方法')
    expect(inserted.inlineStyles?.[0]).toMatchObject({ start: 6, end: 8 })
    const removed = replaceTextRange(content, { start: 2, end: 4 }, '')
    expect(removed.text).toBe('これ強の方法')
    expect(removed.inlineStyles?.[0]).toMatchObject({ start: 2, end: 3 })
  })
  it('挿入文字は隣の書式を継承し、入力予定書式で上書きできる', () => {
    expect(insertionStyle(content, 4)).toEqual({ color: '#FF0000', fontSize: 120 })
    expect(replaceTextRange(content, { start: 4, end: 4 }, '\n').inlineStyles?.[0]).toMatchObject({
      start: 3,
      end: 6,
    })
    expect(
      replaceTextRange(content, { start: 4, end: 4 }, '超', { color: '#0000FF' }).inlineStyles?.[1],
    ).toEqual({ start: 4, end: 5, style: { color: '#0000FF' } })
  })
  it('絵文字、結合文字、ZWJの途中を分割しない', () => {
    expect(normalizeTextRange('A👨‍👩‍👧‍👦B', { start: 2, end: 3 })).toEqual({ start: 1, end: 12 })
    expect(normalizeTextRange('か\u3099X', { start: 1, end: 2 })).toEqual({ start: 0, end: 2 })
    expect(replaceTextRange({ text: 'A😀B' }, { start: 2, end: 3 }, 'C').text).toBe('ACB')
  })
  it('保存由来の範囲を正規化し、重なり・範囲外・不正な値を処理する', () => {
    expect(
      normalizeInlineStyles('ABC', [
        { start: -5, end: 8, style: { color: 'red' } },
        { start: 1, end: 2, style: { fontSize: NaN, color: 'blue' } },
        { start: 2, end: 2, style: { fontSize: 40 } },
      ]),
    ).toEqual([
      { start: 0, end: 1, style: { color: 'red' } },
      { start: 1, end: 2, style: { color: 'blue' } },
      { start: 2, end: 3, style: { color: 'red' } },
    ])
  })
  it('同じ文字が続く入力や削除もカーソル位置で判断する', () => {
    const repeated = { text: 'aaa', inlineStyles: [{ start: 1, end: 2, style: { color: 'red' } }] }
    expect(reconcileText(repeated, 'aa', 0).inlineStyles).toEqual([
      { start: 0, end: 1, style: { color: 'red' } },
    ])
    expect(reconcileText(repeated, 'aaaa', 1, { color: 'blue' }).inlineStyles).toEqual([
      { start: 1, end: 2, style: { color: 'blue' } },
      { start: 2, end: 3, style: { color: 'red' } },
    ])
  })
  it('日本語変換や結合文字の確定を内容を失わず反映する', () => {
    expect(reconcileText({ text: 'かX' }, 'か\u3099X', 1).text).toBe('か\u3099X')
    expect(reconcileText(content, 'これが最強のサムネ', 5).text).toBe('これが最強のサムネ')
  })
  it('サイズ変更は強調の比率を保ち、全体の色変更は部分色を解除する', () => {
    const layer = { ...createTextLayer({ width: 1280, height: 720 }), ...content, fontSize: 60 }
    expect(formatWholeText(layer, { fontSize: 90 }).inlineStyles?.[0].style.fontSize).toBe(180)
    expect(formatWholeText(layer, { color: '#00FF00' }).inlineStyles?.[0].style).toEqual({
      fontSize: 120,
    })
    expect(inlineTextCss({ strokeWidth: 0 })).toMatchObject({
      verticalAlign: 'baseline',
      WebkitTextStrokeWidth: '0px',
    })
  })
})

describe('部分書式の互換性', () => {
  it('複製したレイヤーの部分書式は独立している', () => {
    const layer = { ...createTextLayer({ width: 1280, height: 720 }), ...content }
    const copy = copyLayer(layer)
    expect(copy.type).toBe('text')
    if (copy.type !== 'text') throw new Error('text expected')
    copy.inlineStyles![0].style.color = 'blue'
    expect(layer.inlineStyles?.[0].style.color).toBe('#FF0000')
  })
  it('旧レイヤーは部分書式なしで復元する', () => {
    const thumbnail = {
      ...createThumbnail('旧データ'),
      layers: [createTextLayer({ width: 100, height: 100 })],
    }
    const [normalized] = normalizeThumbnails([thumbnail])
    expect(normalized.layers[0]).toMatchObject({ inlineStyles: [], text: 'テキストを入力' })
  })
  it('部分指定でだけ使用したフォントも保存対象に含める', () => {
    const layer = {
      ...createTextLayer({ width: 100, height: 100 }),
      text: 'AB',
      inlineStyles: [{ start: 0, end: 1, style: { fontFamily: 'custom' } }],
    }
    const font = { id: 'custom', family: 'custom', label: 'Custom', source: 'file' as const }
    expect(collectUsedFonts([{ ...createThumbnail('test'), layers: [layer] }], [font])).toEqual([
      { family: 'custom', label: 'Custom', source: 'file' },
    ])
  })
})
