import { expandTextAlpha } from '@/domain/textOutline'

const masks = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>()

/**
 * 塗りのマスクを円形に広げて縁を描く。太い strokeText の内周の自己交差を避ける。
 * @param context 描画先（フォント・座標変換は設定済み）
 * @param text 描画する字形
 * @param x 字形の左基準位置（CSS px）
 * @param baseline ベースライン（CSS px）
 * @param width 縁の全幅（外側への広がりは半分、CSS px）
 * @param color 縁の色
 * @param ratio 物理pxへの倍率
 */
export function drawTextOutline(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  width: number,
  color: string,
  ratio: number,
) {
  const metrics = context.measureText(text)
  const padding = Math.ceil(width / 2 + 2)
  const left = Math.floor(-metrics.actualBoundingBoxLeft) - padding
  const top = Math.floor(-metrics.actualBoundingBoxAscent) - padding
  const right = Math.ceil(metrics.actualBoundingBoxRight) + padding
  const bottom = Math.ceil(metrics.actualBoundingBoxDescent) + padding
  const mask = masks.get(context) ?? document.createElement('canvas')
  masks.set(context, mask)
  mask.width = Math.ceil((right - left) * ratio)
  mask.height = Math.ceil((bottom - top) * ratio)
  const ink = mask.getContext('2d', { willReadFrequently: true })
  if (!ink) return
  ink.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio)
  ink.font = context.font
  ink.textBaseline = 'alphabetic'
  ink.fillStyle = '#FFFFFF'
  ink.fillText(text, 0, 0)
  const image = ink.getImageData(0, 0, mask.width, mask.height)
  expandTextAlpha(image.data, mask.width, mask.height, (width * ratio) / 2)
  ink.putImageData(image, 0, 0)
  ink.setTransform(1, 0, 0, 1, 0, 0)
  ink.globalCompositeOperation = 'source-in'
  ink.fillStyle = color
  ink.fillRect(0, 0, mask.width, mask.height)
  context.drawImage(mask, x + left, baseline + top, mask.width / ratio, mask.height / ratio)
}
