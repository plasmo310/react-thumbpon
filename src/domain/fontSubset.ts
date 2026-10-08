/** 書き出しに埋め込む候補の @font-face 1件分。値は CSS の記述そのまま */
export type FontFaceInfo = {
  family: string
  weight: string
  unicodeRange: string
  cssText: string
}

/** キャンバス内で実際に使っている書体・太さ・文字 */
export type FontUsage = {
  families: Set<string>
  weights: Set<string>
  codePoints: Set<number>
}

/** 範囲は両端を含む [開始, 終了] のコードポイント */
export type CodePointRange = [number, number]

/**
 * font-family の1項目を比較用にそろえる。CSS 上は引用符の有無や大文字小文字が揺れるため。
 *
 * @param family `"Noto Sans JP"` のような1項目。カンマ区切りの一覧は渡さない
 */
export function normalizeFamily(family: string): string {
  return family.trim().replace(/["']/g, '').toLowerCase()
}

/**
 * unicode-range の記述を範囲の配列にする。
 *
 * @param value `U+3000-303F, U+FF01, U+4??` の形式。解釈できない項目は無視する
 */
export function parseUnicodeRange(value: string): CodePointRange[] {
  const ranges: CodePointRange[] = []
  for (const item of value.split(',')) {
    const match = /^\s*U\+([0-9A-F?]+)(?:-([0-9A-F]+))?\s*$/i.exec(item)
    if (!match) continue
    const [, start, end] = match
    if (start.includes('?')) {
      ranges.push([
        parseInt(start.replace(/\?/g, '0'), 16),
        parseInt(start.replace(/\?/g, 'F'), 16),
      ])
    } else {
      ranges.push([parseInt(start, 16), parseInt(end ?? start, 16)])
    }
  }
  return ranges
}

/**
 * 範囲のどれかに、使っている文字が1つでも入っているか。
 *
 * @param ranges     parseUnicodeRange の結果
 * @param codePoints キャンバス内の文字のコードポイント
 */
export function rangesContainAny(ranges: CodePointRange[], codePoints: Set<number>): boolean {
  for (const code of codePoints) {
    if (ranges.some(([start, end]) => start <= code && code <= end)) return true
  }
  return false
}

/**
 * @font-face の太さが、使っている太さのどれかを受け持つか。
 *
 * @param faceWeight `700` か、可変フォントの `100 900` の形式
 * @param weights    getComputedStyle の fontWeight（`400` など数値の文字列）
 */
function coversWeight(faceWeight: string, weights: Set<string>): boolean {
  const [min, max = min] = faceWeight.trim().split(/\s+/).map(Number)
  return [...weights].some((weight) => min <= Number(weight) && Number(weight) <= max)
}

/**
 * 書き出しに必要な @font-face だけを選ぶ。
 * Google Fonts の日本語書体は文字範囲ごとに百以上へ分割されているため、全部を埋め込むと極端に遅くなる。
 *
 * @param faces 候補。読み込み済みの Web フォント CSS のすべての @font-face
 * @param used  キャンバス内で使っている書体・太さ・文字
 */
export function selectFontFaces(faces: FontFaceInfo[], used: FontUsage): FontFaceInfo[] {
  const families = new Set([...used.families].map(normalizeFamily))
  const byFamily = new Map<string, FontFaceInfo[]>()
  for (const face of faces) {
    const family = normalizeFamily(face.family)
    if (!families.has(family)) continue
    byFamily.set(family, [...(byFamily.get(family) ?? []), face])
  }

  const selected: FontFaceInfo[] = []
  for (const group of byFamily.values()) {
    // 使っている太さの書体が無ければ、ブラウザの近い太さの選択に任せるため全部残す
    const exact = group.filter((face) => coversWeight(face.weight, used.weights))
    for (const face of exact.length > 0 ? exact : group) {
      const ranges = parseUnicodeRange(face.unicodeRange)
      if (ranges.length === 0 || rangesContainAny(ranges, used.codePoints)) selected.push(face)
    }
  }
  return selected
}
