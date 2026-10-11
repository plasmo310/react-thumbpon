import { inlineTextCss, textSegments } from '@/domain/text'
import type { TextContent, TextRange } from '@/domain/text'

/**
 * 入力DOMをプレーンテキストへ直す。ブラウザが挿入する改行要素も扱う。
 * @param root 入力要素
 */
export function readEditorText(root: HTMLElement): string {
  // 全削除後にブラウザが残す単独のbrは、改行ではなくカーソル用の空行である。
  if (!root.textContent && root.querySelectorAll('br:not([data-text-sentinel])').length === 1)
    return ''
  function read(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (!(node instanceof HTMLElement)) return ''
    if (node.dataset.textSentinel) return ''
    if (node.tagName === 'BR') return '\n'
    let value = ''
    for (const child of node.childNodes) {
      const block = child instanceof HTMLElement && ['DIV', 'P'].includes(child.tagName)
      if (block && value && !value.endsWith('\n')) value += '\n'
      value += read(child)
    }
    return value
  }
  return read(root).replace(/\r\n?/g, '\n')
}

/**
 * DOM選択をUTF-16位置へ変換する。入力欄外の選択は無視する。
 * @param root 入力要素
 */
export function readEditorSelection(root: HTMLElement): TextRange | null {
  const selection = window.getSelection()
  if (
    !selection?.anchorNode ||
    !selection.focusNode ||
    !root.contains(selection.anchorNode) ||
    !root.contains(selection.focusNode)
  )
    return null
  function offset(node: Node, position: number) {
    const range = document.createRange()
    range.selectNodeContents(root)
    range.setEnd(node, position)
    const temporary = document.createElement('div')
    temporary.append(range.cloneContents())
    return readEditorText(temporary).length
  }
  const anchor = offset(selection.anchorNode, selection.anchorOffset)
  const focus = offset(selection.focusNode, selection.focusOffset)
  return {
    start: Math.min(anchor, focus),
    end: Math.max(anchor, focus),
    ...(anchor > focus ? { backward: true } : {}),
  }
}

/**
 * 正規化済みの文字位置からDOM選択を復元する。
 * @param root 入力要素
 * @param selected UTF-16の選択範囲
 */
export function restoreEditorSelection(root: HTMLElement, selected: TextRange) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node = walker.nextNode()
  while (node) {
    nodes.push(node as Text)
    node = walker.nextNode()
  }
  if (!nodes.length) return
  function locate(position: number): [Text, number] {
    let remaining = Math.max(0, position)
    for (const text of nodes) {
      if (remaining <= text.length) return [text, remaining]
      remaining -= text.length
    }
    const last = nodes[nodes.length - 1]
    return [last, last.length]
  }
  const range = document.createRange()
  range.setStart(...locate(selected.start))
  range.setEnd(...locate(selected.end))
  const selection = window.getSelection()
  selection?.removeAllRanges()
  if (selected.backward)
    selection?.setBaseAndExtent(
      range.endContainer,
      range.endOffset,
      range.startContainer,
      range.startOffset,
    )
  else selection?.addRange(range)
}

/**
 * 信頼できるモデルだけから入力DOMを作る。外部HTMLは取り込まない。
 * @param root 入力要素
 * @param content 文字列と部分書式
 * @param previewBaseSize サイドバー表示の基準文字サイズ(px)。指定すると相対サイズへ変換する
 */
export function paintEditorText(root: HTMLElement, content: TextContent, previewBaseSize?: number) {
  const fragment = document.createDocumentFragment()
  for (const segment of textSegments(content)) {
    const span = document.createElement('span')
    const css = inlineTextCss(segment.style)
    for (const [key, value] of Object.entries(css)) {
      if (value === undefined) continue
      if (key.startsWith('--')) {
        span.style.setProperty(key, String(value))
        continue
      }
      const dimension =
        key === 'fontSize'
          ? previewBaseSize
            ? `${Number(value) / previewBaseSize}em`
            : `${value}px`
          : key === 'WebkitTextStrokeWidth' && previewBaseSize
            ? `${parseFloat(String(value)) / previewBaseSize}em`
            : String(value)
      Object.assign(span.style, { [key]: dimension })
    }
    span.textContent = content.text.slice(segment.start, segment.end)
    fragment.append(span)
  }
  if (!content.text) fragment.append(document.createTextNode(''))
  if (!content.text || content.text.endsWith('\n')) {
    const sentinel = document.createElement('br')
    sentinel.dataset.textSentinel = 'true'
    fragment.append(sentinel)
  }
  root.replaceChildren(fragment)
}

type OutlineGlyph = {
  text: string
  font: string
  /** 前面のレイアウト上の位置(px)。表示の縮小を打ち消した実寸 */
  x: number
  top: number
  bottom: number
  right: number
  strokeWidth: number
  strokeColor: string
  outerWidth: number
  outerColor: string
}

/** 縁1の下描き用 canvas。入力のたびに確保し直さないよう、背面ごとに使い回す */
const strokeCanvases = new WeakMap<HTMLElement, HTMLCanvasElement>()

/** 縁の隙間を塞ぐ幅の半分(px)。これの2倍までの細い隙間を塞ぐ */
const SEAM_RADIUS = 2

/**
 * 細い隙間を、まわりの縁の色で塞ぐ（モルフォロジーのクロージング）。
 * 字の穴や字の画どうしの間が縁の幅よりわずかに広いと、両側の縁の間に1〜2pxの筋が残り、線が切れて見える。
 * 透明度に「近くの最大 → 近くの最小」を掛けると、幅 radius×2 までの隙間だけが埋まり、
 * それより広い穴や縁の外形・アンチエイリアスはそのまま残る。
 * @param data 1色の縁を描いた画素（RGBA、書き換える）
 * @param width 画像の幅(px)
 * @param height 画像の高さ(px)
 * @param radius 隙間を塞ぐ幅の半分(px)
 */
export function closeSeams(data: Uint8ClampedArray, width: number, height: number, radius: number) {
  if (radius <= 0) return
  const size = width * height
  const alpha = new Uint8ClampedArray(size)
  for (let i = 0; i < size; i++) alpha[i] = data[i * 4 + 3]
  // 1方向ずつ「近くの最大（または最小）」を取る。画像の外は透明として扱い、端で縁が太らないようにする
  const sweep = (from: Uint8ClampedArray, horizontal: boolean, pickMax: boolean) => {
    const out = new Uint8ClampedArray(size)
    const length = horizontal ? width : height
    const lines = horizontal ? height : width
    const step = horizontal ? 1 : width
    for (let line = 0; line < lines; line++) {
      const base = horizontal ? line * width : line
      for (let i = 0; i < length; i++) {
        const lo = i - radius
        const hi = i + radius
        let best = pickMax ? 0 : 255
        // 画像の外は透明（0）として扱う。最小を取るときに端の画素が欠けないよう、外にかかるなら 0
        if (!pickMax && (lo < 0 || hi >= length)) best = 0
        else {
          const start = lo < 0 ? 0 : lo
          const end = hi >= length ? length - 1 : hi
          for (let j = start; j <= end; j++) {
            const value = from[base + j * step]
            if (pickMax ? value > best : value < best) best = value
          }
        }
        out[base + i * step] = best
      }
    }
    return out
  }
  const dilated = sweep(sweep(alpha, true, true), false, true)
  const closed = sweep(sweep(dilated, true, false), false, false)
  for (let i = 0; i < size; i++) {
    if (closed[i] <= alpha[i]) continue
    const at = i * 4
    // 元が透明だった画素は色を持たないので、近くでいちばん濃い画素の色にする（埋まる画素はわずかなので、ここだけ探す）
    if (alpha[i] === 0) {
      const x = i % width
      const y = (i - x) / width
      let best = -1
      let from = at
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const value = alpha[ny * width + nx]
          if (value > best) {
            best = value
            from = (ny * width + nx) * 4
          }
        }
      }
      data[at] = data[from]
      data[at + 1] = data[from + 1]
      data[at + 2] = data[from + 2]
    }
    data[at + 3] = closed[i]
  }
}

/** 前面の文字ノードを、DOM の並び順で集める */
function textNodes(node: Node, found: Text[] = []): Text[] {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) found.push(child as Text)
    else textNodes(child, found)
  }
  return found
}

/**
 * 縁1と縁2を、前面の文字と同じ位置に canvas で描く。
 * ブラウザの縁取り（-webkit-text-stroke）は角を尖らせてつなぐため、文字に対して太いと小さな角から突起が出る。
 * SVG の膨張は正方形でしか広げられず丸い字の縁が角ばり、写しを重ねて円に近づけると縮小表示でジャギが出る。
 * canvas の縁取りは角を丸くつなげられ、アンチエイリアスも正しく掛かるので、縁はすべてここで描き、前面は塗りだけにする。
 * 文字の位置は前面の DOM から1字ずつ測るので、折り返し・字間・部分書式・行のトリムはそのまま揃う。
 * @param root 入力中の未確定文字も含む前面DOM
 * @param outline 選択と入力から除外した背面の格納先
 * @param previewBaseSize サイドバー表示の基準文字サイズ(px)。省略時は実寸
 */
export function paintEditorOutline(
  root: HTMLElement,
  outline: HTMLElement,
  previewBaseSize?: number,
) {
  const rootRect = root.getBoundingClientRect()
  // キャンバスは CSS transform で縮小表示しているので、測った位置を実寸に戻す
  const displayScale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1
  const sizeScale = previewBaseSize
    ? parseFloat(getComputedStyle(root).fontSize) / previewBaseSize
    : 1
  const segmenter = new Intl.Segmenter()
  const range = document.createRange()
  const glyphs: OutlineGlyph[] = []
  let reach = 0
  for (const node of textNodes(root)) {
    const parent = node.parentElement
    if (!parent) continue
    const css = getComputedStyle(parent)
    const strokeWidth = parseFloat(css.webkitTextStrokeWidth) || 0
    const offset = Math.max(
      0,
      Number(css.getPropertyValue('--text-outer-stroke-width')) * sizeScale,
    )
    if (strokeWidth <= 0 && offset <= 0) continue
    const fontSize = parseFloat(css.fontSize) || 0
    const style = {
      font: `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`,
      strokeWidth,
      strokeColor:
        css.getPropertyValue('--text-stroke-color').trim() || String(css.webkitTextStrokeColor),
      outerWidth: offset > 0 ? strokeWidth + offset * 2 : 0,
      outerColor: css.getPropertyValue('--text-outer-stroke-color').trim(),
    }
    // 字形は文字の箱から少しはみ出すので、縁の半分に文字の大きさの半分を足した余白を取る
    reach = Math.max(reach, Math.max(strokeWidth, style.outerWidth) / 2 + fontSize / 2)
    for (const { index, segment } of segmenter.segment(node.data)) {
      if (!segment.trim()) continue
      range.setStart(node, index)
      range.setEnd(node, index + segment.length)
      const rect = [...range.getClientRects()].find((box) => box.width > 0)
      if (!rect) continue
      glyphs.push({
        ...style,
        text: segment,
        x: (rect.left - rootRect.left) / displayScale,
        top: (rect.top - rootRect.top) / displayScale,
        bottom: (rect.bottom - rootRect.top) / displayScale,
        right: (rect.right - rootRect.left) / displayScale,
      })
    }
  }
  if (glyphs.length === 0) {
    outline.replaceChildren()
    return
  }
  const left = Math.floor(Math.min(...glyphs.map((glyph) => glyph.x)) - reach)
  const top = Math.floor(Math.min(...glyphs.map((glyph) => glyph.top)) - reach)
  const width = Math.ceil(Math.max(...glyphs.map((glyph) => glyph.right)) + reach) - left
  const height = Math.ceil(Math.max(...glyphs.map((glyph) => glyph.bottom)) + reach) - top
  // 書き出しは実寸の1倍で使うので、縮小表示に合わせて解像度を落とさない
  const ratio = Math.max(1, window.devicePixelRatio || 1)
  const pixelWidth = Math.ceil(width * ratio)
  const pixelHeight = Math.ceil(height * ratio)
  // 入力のたびに作り直すと大きな画像を毎回確保するため、前の canvas を使い回す
  const previous = outline.firstElementChild
  const canvas = previous instanceof HTMLCanvasElement ? previous : document.createElement('canvas')
  // 縁1は別の canvas に描き、隙間を塞いでから縁2の上に重ねる
  const strokeCanvas = strokeCanvases.get(outline) ?? document.createElement('canvas')
  strokeCanvases.set(outline, strokeCanvas)
  for (const target of [canvas, strokeCanvas]) {
    target.width = pixelWidth
    target.height = pixelHeight
  }
  Object.assign(canvas.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  })
  const outerContext = canvas.getContext('2d', { willReadFrequently: true })
  const strokeContext = strokeCanvas.getContext('2d', { willReadFrequently: true })
  if (!outerContext || !strokeContext) return
  // 縁は字の外側の輪郭にも、字の穴（o の内側など）の輪郭にも同じ幅で付く
  const draw = (
    context: CanvasRenderingContext2D,
    pick: (glyph: OutlineGlyph) => { width: number; color: string } | null,
  ) => {
    context.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio)
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    for (const glyph of glyphs) {
      const band = pick(glyph)
      if (!band) continue
      context.font = glyph.font
      // 文字の箱の上端から、フォントの上側の高さだけ下がった位置がベースライン
      const baseline = glyph.top + context.measureText(glyph.text).fontBoundingBoxAscent
      context.lineWidth = band.width
      context.strokeStyle = band.color
      context.fillStyle = band.color
      context.strokeText(glyph.text, glyph.x, baseline)
      context.fillText(glyph.text, glyph.x, baseline)
    }
    const image = context.getImageData(0, 0, pixelWidth, pixelHeight)
    closeSeams(image.data, pixelWidth, pixelHeight, Math.round(SEAM_RADIUS * ratio))
    context.putImageData(image, 0, 0)
  }
  draw(outerContext, (glyph) =>
    glyph.outerWidth > 0 ? { width: glyph.outerWidth, color: glyph.outerColor } : null,
  )
  draw(strokeContext, (glyph) =>
    glyph.strokeWidth > 0 ? { width: glyph.strokeWidth, color: glyph.strokeColor } : null,
  )
  // 縁2をすべて描いてから縁1を重ねる。隣の文字の縁2が縁1の上に被らないようにするため
  outerContext.setTransform(1, 0, 0, 1, 0, 0)
  outerContext.drawImage(strokeCanvas, 0, 0)
  if (canvas !== previous) outline.replaceChildren(canvas)
}
