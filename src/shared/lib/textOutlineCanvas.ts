import type { TextStrokeJoin } from '@/domain/layer'
import { expandTextAlpha } from '@/domain/textOutline'

type Mask = { canvas: HTMLCanvasElement; left: number; top: number }
const cache = new Map<string, Mask>()
const tinted = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>()
// 大きな文字を編集し続けても古い字形を無制限に保持しない（RGBAで最大32MiB）。
const MAX_PIXELS = 8 * 1024 * 1024
const MITER_LIMIT = 4
let cachedPixels = 0
let fontRevision = 0
let owner: Document | undefined

function invalidateFonts() {
  cache.clear()
  cachedPixels = 0
  fontRevision++
}

/** フォント読込後に、代替フォントで作った字形と完成画像を使い回さないための世代番号。 */
export function textOutlineFontRevision() {
  if (owner !== document) {
    owner?.fonts?.removeEventListener('loadingdone', invalidateFonts)
    owner = document
    owner.fonts?.addEventListener('loadingdone', invalidateFonts)
    invalidateFonts()
  }
  return fontRevision
}

function glyphMask(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  ratio: number,
  join: TextStrokeJoin,
): Mask | null {
  const key = JSON.stringify([context.font, text, width, ratio, join])
  const saved = cache.get(key)
  if (saved) {
    cache.delete(key)
    cache.set(key, saved)
    return saved
  }
  // 丸いマスクを下地にすることで、角を残す場合も小さい穴の再出現を防ぐ。
  const rounded = join === 'miter' ? glyphMask(context, text, width, ratio, 'round') : null
  const metrics = context.measureText(text)
  const padding = Math.ceil((width / 2) * (join === 'miter' ? MITER_LIMIT : 1) + 2)
  const left = Math.floor(-metrics.actualBoundingBoxLeft) - padding
  const top = Math.floor(-metrics.actualBoundingBoxAscent) - padding
  const right = Math.ceil(metrics.actualBoundingBoxRight) + padding
  const bottom = Math.ceil(metrics.actualBoundingBoxDescent) + padding
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((right - left) * ratio)
  canvas.height = Math.ceil((bottom - top) * ratio)
  const ink = canvas.getContext('2d', { willReadFrequently: join === 'round' })
  if (!ink) return null
  ink.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio)
  ink.font = context.font
  ink.textAlign = 'left'
  ink.textBaseline = 'alphabetic'
  ink.fillStyle = '#FFFFFF'
  if (join === 'miter') {
    ink.lineJoin = 'miter'
    ink.miterLimit = MITER_LIMIT
    ink.lineWidth = width
    ink.strokeStyle = '#FFFFFF'
    ink.strokeText(text, 0, 0)
    if (rounded)
      ink.drawImage(
        rounded.canvas,
        rounded.left,
        rounded.top,
        rounded.canvas.width / ratio,
        rounded.canvas.height / ratio,
      )
  }
  ink.fillText(text, 0, 0)
  if (join === 'round') {
    const image = ink.getImageData(0, 0, canvas.width, canvas.height)
    expandTextAlpha(image.data, canvas.width, canvas.height, (width * ratio) / 2)
    ink.putImageData(image, 0, 0)
  }
  const result = { canvas, left, top }
  const pixels = canvas.width * canvas.height
  if (pixels <= MAX_PIXELS) {
    while (cachedPixels + pixels > MAX_PIXELS && cache.size) {
      const [oldKey, old] = cache.entries().next().value!
      cachedPixels -= old.canvas.width * old.canvas.height
      cache.delete(oldKey)
    }
    cache.set(key, result)
    cachedPixels += pixels
  }
  return result
}

/**
 * 字形・太さごとのマスクを再利用して縁を描く。移動や色変更では画素の距離計算を繰り返さない。
 * @param context 描画先（フォント・座標変換は設定済み）
 * @param text 描画する字形
 * @param x 字形の左基準位置（CSS px）
 * @param baseline ベースライン（CSS px）
 * @param width 縁の全幅（外側への広がりは半分、CSS px）
 * @param color 縁の色
 * @param ratio 物理pxへの倍率
 * @param join 角を丸めるか、文字の角を残すか
 */
export function drawTextOutline(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  width: number,
  color: string,
  ratio: number,
  join: TextStrokeJoin = 'round',
) {
  textOutlineFontRevision()
  const mask = glyphMask(context, text, width, ratio, join)
  if (!mask) return
  const canvas = tinted.get(context) ?? document.createElement('canvas')
  tinted.set(context, canvas)
  if (canvas.width !== mask.canvas.width) canvas.width = mask.canvas.width
  if (canvas.height !== mask.canvas.height) canvas.height = mask.canvas.height
  const ink = canvas.getContext('2d')
  if (!ink) return
  ink.clearRect(0, 0, canvas.width, canvas.height)
  ink.globalCompositeOperation = 'source-over'
  ink.drawImage(mask.canvas, 0, 0)
  ink.globalCompositeOperation = 'source-in'
  ink.fillStyle = color
  ink.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(
    canvas,
    x + mask.left,
    baseline + mask.top,
    canvas.width / ratio,
    canvas.height / ratio,
  )
}
