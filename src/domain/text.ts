import type { CSSProperties } from 'react'
import type { TextLayer } from './layer'

/** 部分指定できる書式。指定の無い項目はレイヤー全体の値を継承する。 */
export type InlineTextStyle = Partial<
  Pick<
    TextLayer,
    'color' | 'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'strokeWidth' | 'strokeColor'
  >
>
export type TextRange = { start: number; end: number; backward?: boolean }
export type InlineStyleRange = TextRange & { style: InlineTextStyle }
export type TextContent = { text: string; inlineStyles?: InlineStyleRange[] }

const INLINE_STYLE_KEYS = [
  'color',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'strokeWidth',
  'strokeColor',
] as const

/**
 * DOM と同じ UTF-16 位置を、絵文字や結合文字を分断しない範囲に直す。
 * @param text 対象文字列
 * @param range 開始・終了位置。終了位置は含まない
 */
export function normalizeTextRange(text: string, range: TextRange): TextRange {
  const boundaries = [
    0,
    ...Array.from(
      new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text),
      (part) => part.index + part.segment.length,
    ),
  ]
  const start = Math.max(0, Math.min(text.length, Math.min(range.start, range.end)))
  const end = Math.max(start, Math.min(text.length, Math.max(range.start, range.end)))
  const floor = (n: number) => boundaries.filter((b) => b <= n).at(-1) ?? 0
  if (start === end) return { start: floor(start), end: floor(start) }
  return {
    start: floor(start),
    end: boundaries.find((b) => b >= end) ?? text.length,
    ...(range.backward ? { backward: true } : {}),
  }
}

function cleanStyle(style: InlineTextStyle): InlineTextStyle {
  const result: InlineTextStyle = {}
  for (const key of INLINE_STYLE_KEYS) {
    const value = style[key]
    if (value === undefined) continue
    if (key === 'fontSize' && (typeof value !== 'number' || !Number.isFinite(value) || value < 4))
      continue
    if (
      (key === 'fontWeight' || key === 'strokeWidth') &&
      (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    )
      continue
    if (key === 'fontStyle' && value !== 'normal' && value !== 'italic') continue
    if (
      (key === 'color' || key === 'strokeColor' || key === 'fontFamily') &&
      typeof value !== 'string'
    )
      continue
    Object.assign(result, { [key]: value })
  }
  return result
}

function sameStyle(a: InlineTextStyle, b: InlineTextStyle) {
  return INLINE_STYLE_KEYS.every((key) => a[key] === b[key])
}

/**
 * 部分書式を範囲内・重なりなしに正規化する。後の指定が優先される。
 * @param text 対象文字列
 * @param ranges 保存・編集由来の部分書式
 */
export function normalizeInlineStyles(
  text: string,
  ranges: InlineStyleRange[] = [],
): InlineStyleRange[] {
  const safe = (Array.isArray(ranges) ? ranges : [])
    .filter((r) => r && Number.isFinite(r.start) && Number.isFinite(r.end) && r.style)
    .map((r) => ({ ...normalizeTextRange(text, r), style: cleanStyle(r.style) }))
    .filter((r) => r.end > r.start)
  const points = [...new Set(safe.flatMap((r) => [r.start, r.end]))].sort((a, b) => a - b)
  const result: InlineStyleRange[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i],
      end = points[i + 1]
    const style = Object.assign(
      {},
      ...safe.filter((r) => r.start <= start && r.end >= end).map((r) => r.style),
    )
    if (!Object.keys(style).length) continue
    const previous = result.at(-1)
    if (previous?.end === start && sameStyle(previous.style, style)) previous.end = end
    else result.push({ start, end, style })
  }
  return result
}

/**
 * 通常部分を含む描画用の連続区間を返す。
 * @param content 文字列と部分書式
 */
export function textSegments(content: TextContent): InlineStyleRange[] {
  const ranges = normalizeInlineStyles(content.text, content.inlineStyles)
  const result: InlineStyleRange[] = []
  let position = 0
  for (const range of ranges) {
    if (position < range.start) result.push({ start: position, end: range.start, style: {} })
    result.push(range)
    position = range.end
  }
  if (position < content.text.length)
    result.push({ start: position, end: content.text.length, style: {} })
  return result
}

/**
 * 選択範囲に書式を適用する。null は部分書式の解除。
 * @param content 変更前の文章
 * @param range 適用範囲
 * @param patch 変更する書式
 */
export function formatTextRange(
  content: TextContent,
  range: TextRange,
  patch: InlineTextStyle | null,
): TextContent {
  const selected = normalizeTextRange(content.text, range)
  if (selected.start === selected.end) return content
  const ranges: InlineStyleRange[] = []
  for (const segment of textSegments(content)) {
    const start = Math.max(segment.start, selected.start),
      end = Math.min(segment.end, selected.end)
    if (start >= end) {
      ranges.push(segment)
      continue
    }
    if (segment.start < start) ranges.push({ ...segment, end: start })
    ranges.push({ start, end, style: patch === null ? {} : { ...segment.style, ...patch } })
    if (end < segment.end) ranges.push({ ...segment, start: end })
  }
  return { text: content.text, inlineStyles: normalizeInlineStyles(content.text, ranges) }
}

/**
 * 挿入時に引き継ぐ部分書式を返す。
 * @param content 文章
 * @param position 挿入位置。先頭では直後、それ以外では直前を使う
 */
export function insertionStyle(content: TextContent, position: number): InlineTextStyle {
  const index = position > 0 ? position - 1 : 0
  return { ...content.inlineStyles?.find((r) => r.start <= index && index < r.end)?.style }
}

/**
 * 文字列を置換し、残った文字の書式をずらして保持する。
 * @param content 変更前の文章
 * @param range 置換範囲
 * @param inserted 挿入するプレーンテキスト
 * @param style 挿入文字の部分書式。省略時は隣接文字から継承
 */
export function replaceTextRange(
  content: TextContent,
  range: TextRange,
  inserted: string,
  style?: InlineTextStyle,
): TextContent {
  const { start, end } = normalizeTextRange(content.text, range)
  const text = content.text.slice(0, start) + inserted + content.text.slice(end)
  const delta = inserted.length - (end - start)
  const ranges: InlineStyleRange[] = []
  for (const segment of textSegments(content)) {
    if (segment.start < start) ranges.push({ ...segment, end: Math.min(segment.end, start) })
    if (segment.end > end)
      ranges.push({
        ...segment,
        start: Math.max(segment.start, end) + delta,
        end: segment.end + delta,
      })
  }
  if (inserted.length)
    ranges.push({
      start,
      end: start + inserted.length,
      style: style ?? insertionStyle(content, start),
    })
  return { text, inlineStyles: normalizeInlineStyles(text, ranges) }
}

/**
 * ブラウザによる文字入力を最小の置換へ変換する。同じ文字が続く場合はカーソル位置を使う。
 * @param content 変更前の文章
 * @param nextText DOMから読んだ新しい文章
 * @param hint 変更前後のカーソルのうち小さい位置
 * @param style 入力予定の部分書式
 */
export function reconcileText(
  content: TextContent,
  nextText: string,
  hint = content.text.length,
  style?: InlineTextStyle,
): TextContent {
  if (content.text === nextText) return content
  let start = 0
  while (
    start < hint &&
    start < content.text.length &&
    start < nextText.length &&
    content.text[start] === nextText[start]
  )
    start++
  let end = content.text.length,
    nextEnd = nextText.length
  while (end > start && nextEnd > start && content.text[end - 1] === nextText[nextEnd - 1]) {
    end--
    nextEnd--
  }
  const safe = normalizeTextRange(content.text, { start, end })
  // 結合文字の変化は、共通と見なした前後の文字も一緒に置換して内容を保つ。
  const suffix = content.text.length - safe.end
  return replaceTextRange(
    content,
    safe,
    nextText.slice(safe.start, nextText.length - suffix),
    style,
  )
}

/**
 * 部分書式をHTML描画用へ変換する。
 * @param style 上書きする書式
 */
export function inlineTextCss(style: InlineTextStyle): CSSProperties {
  const { strokeWidth, strokeColor, ...font } = style
  return {
    ...font,
    verticalAlign: 'baseline',
    WebkitTextStrokeWidth: strokeWidth === undefined ? undefined : `${strokeWidth}px`,
    WebkitTextStrokeColor: strokeColor,
  }
}

/**
 * 全体書式の変更。サイズは比例変更し、その他の変更項目は部分指定を解除する。
 * @param layer 元のテキストレイヤー
 * @param patch 全体へ適用する書式
 */
export function formatWholeText(layer: TextLayer, patch: InlineTextStyle): Partial<TextLayer> {
  const factor = patch.fontSize === undefined ? 1 : Math.max(4, patch.fontSize) / layer.fontSize
  const ranges = (layer.inlineStyles ?? []).map((range) => {
    const style = { ...range.style }
    for (const key of INLINE_STYLE_KEYS) {
      if (patch[key] === undefined) continue
      if (key === 'fontSize') {
        if (style.fontSize !== undefined) style.fontSize = Math.max(4, style.fontSize * factor)
      } else delete style[key]
    }
    return { ...range, style }
  })
  return { ...patch, inlineStyles: normalizeInlineStyles(layer.text, ranges) }
}
