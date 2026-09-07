import { toPng } from 'html-to-image'
import type { CanvasSize } from '../types/editor'

let surfaceElement: HTMLElement | null = null

export function registerSurface(element: HTMLElement | null) {
  surfaceElement = element
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`
}

export async function exportPng(canvas: CanvasSize) {
  if (!surfaceElement) throw new Error('キャンバスが準備できていません')

  const options = {
    width: canvas.width,
    height: canvas.height,
    pixelRatio: 1,
    cacheBust: true,
    // 表示用の縮小スケールを打ち消して実寸で書き出す
    style: { transform: 'none', transformOrigin: 'top left' },
    // 選択枠などのUIは出力に含めない
    filter: (node: Node) => !(node instanceof HTMLElement && node.dataset.exportIgnore),
  }

  // 1回目はWebフォントや画像の埋め込みが間に合わないことがあるため捨てる（html-to-imageの既知の挙動）
  await toPng(surfaceElement, options)
  const dataUrl = await toPng(surfaceElement, options)

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `thumbpon-${timestamp()}.png`
  link.click()
}
