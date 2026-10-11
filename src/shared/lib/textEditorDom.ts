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
  /** 前面の文字の塗りの色。縁1の無い文字でも、字の穴を見分けるために形を描く */
  color: string
  strokeWidth: number
  strokeColor: string
  outerWidth: number
  outerColor: string
}

/** 字の穴の判定に使う、縁1の下描き用 canvas。入力のたびに確保し直さないよう背面ごとに使い回す */
const innerCanvases = new WeakMap<HTMLElement, HTMLCanvasElement>()

/**
 * 字の穴（o の内側など）の中に縁2を出さない。
 * 縁1と縁2は字の内側の輪郭にも付くため、穴の中で縁1の内側に縁2の白い輪が覗いてしまう。
 * 縁1と文字の形（inner）の空いた所のうち、画像の外周から塗りつぶしで届かない所を穴とみなし、
 * そこの縁2（outer）を消す。縁1の幅に比べてごく小さい穴は、点のように見えるので縁1の色で埋める。
 * @param inner 縁1と文字の形の画素（RGBA、書き換える）
 * @param outer 縁2の画素（RGBA、書き換える）
 * @param width 画像の幅(px)
 * @param height 画像の高さ(px)
 * @param minHoleArea これより小さい穴は埋める(px²)
 */
export function resolveCounters(
  inner: Uint8ClampedArray,
  outer: Uint8ClampedArray,
  width: number,
  height: number,
  minHoleArea: number,
) {
  const size = width * height
  // 縁1の不透明な所だけを壁にする。アンチエイリアスの半透明な画素は穴の側に含めて縁2を消す
  const open = (index: number) => inner[index * 4 + 3] < 255
  // 0: 未判定、1: 外側、2: 穴
  const region = new Uint8Array(size)
  const queue = new Int32Array(size)
  let tail = 0
  const reach = (index: number) => {
    if (region[index] === 0 && open(index)) {
      region[index] = 1
      queue[tail++] = index
    }
  }
  for (let x = 0; x < width; x++) {
    reach(x)
    reach((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    reach(y * width)
    reach(y * width + width - 1)
  }
  const neighbors = (index: number, visit: (next: number) => void) => {
    const x = index % width
    if (x > 0) visit(index - 1)
    if (x < width - 1) visit(index + 1)
    if (index >= width) visit(index - width)
    if (index < size - width) visit(index + width)
  }
  for (let head = 0; head < tail; head++) neighbors(queue[head], reach)
  for (let start = 0; start < size; start++) {
    if (region[start] !== 0 || !open(start)) continue
    // 穴を1つずつ集め、まわりの縁1の色を覚えておく（小さい穴を埋める色）
    tail = 0
    region[start] = 2
    queue[tail++] = start
    let wall = -1
    for (let head = 0; head < tail; head++) {
      neighbors(queue[head], (next) => {
        if (open(next)) {
          if (region[next] === 0) {
            region[next] = 2
            queue[tail++] = next
          }
        } else if (wall < 0) wall = next
      })
    }
    const fill = tail < minHoleArea && wall >= 0
    for (let i = 0; i < tail; i++) {
      const at = queue[i] * 4
      outer[at + 3] = 0
      if (fill) {
        inner[at] = inner[wall * 4]
        inner[at + 1] = inner[wall * 4 + 1]
        inner[at + 2] = inner[wall * 4 + 2]
        inner[at + 3] = 255
      }
    }
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
      color: css.color,
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
  const inner = innerCanvases.get(outline) ?? document.createElement('canvas')
  innerCanvases.set(outline, inner)
  for (const target of [canvas, inner]) {
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
  const innerContext = inner.getContext('2d', { willReadFrequently: true })
  if (!outerContext || !innerContext) return
  type Band = { width: number; stroke: string; fill: string }
  const draw = (context: CanvasRenderingContext2D, pick: (glyph: OutlineGlyph) => Band | null) => {
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
      if (band.width > 0) {
        context.lineWidth = band.width
        context.strokeStyle = band.stroke
        context.strokeText(glyph.text, glyph.x, baseline)
      }
      context.fillStyle = band.fill
      context.fillText(glyph.text, glyph.x, baseline)
    }
  }
  draw(outerContext, (glyph) =>
    glyph.outerWidth > 0
      ? { width: glyph.outerWidth, stroke: glyph.outerColor, fill: glyph.outerColor }
      : null,
  )
  draw(innerContext, (glyph) =>
    glyph.strokeWidth > 0
      ? { width: glyph.strokeWidth, stroke: glyph.strokeColor, fill: glyph.strokeColor }
      : { width: 0, stroke: '', fill: glyph.color },
  )
  const outerImage = outerContext.getImageData(0, 0, pixelWidth, pixelHeight)
  const innerImage = innerContext.getImageData(0, 0, pixelWidth, pixelHeight)
  const thickest = Math.max(...glyphs.map((glyph) => glyph.strokeWidth)) * ratio
  resolveCounters(innerImage.data, outerImage.data, pixelWidth, pixelHeight, (thickest * 0.6) ** 2)
  outerContext.putImageData(outerImage, 0, 0)
  innerContext.putImageData(innerImage, 0, 0)
  // 縁2をすべて描いてから縁1を重ねる。隣の文字の縁2が縁1の上に被らないようにするため
  outerContext.setTransform(1, 0, 0, 1, 0, 0)
  outerContext.drawImage(inner, 0, 0)
  if (canvas !== previous) outline.replaceChildren(canvas)
}
