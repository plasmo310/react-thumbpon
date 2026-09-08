import { toPng } from 'html-to-image'
import { downloadDataUrl } from './dom/download'
import type { CanvasSize } from '../types'

let surfaceElement: HTMLElement | null = null

export function registerSurface(element: HTMLElement | null) {
  surfaceElement = element
}

/** サムネイル名をファイル名として使えるようにする */
function toFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()
  return cleaned || 'thumbpon'
}

export async function exportPng(canvas: CanvasSize, name: string) {
  if (!surfaceElement) throw new Error('キャンバスが準備できていません')

  const options = {
    width: canvas.width,
    height: canvas.height,
    pixelRatio: 1,
    // cacheBust を有効にすると html-to-image が URL に ?<timestamp> を付けてしまい、
    // 素材画像の blob: URL が壊れて fetch に失敗する。素材は URL 自体が一意なので不要。
    cacheBust: false,
    // 表示用の縮小スケールを打ち消して実寸で書き出す
    style: { transform: 'none', transformOrigin: 'top left' },
    // 選択枠などのUIは出力に含めない
    filter: (node: Node) => !(node instanceof HTMLElement && node.dataset.exportIgnore),
  }

  // 1回目はWebフォントや画像の埋め込みが間に合わないことがあるため捨てる（html-to-imageの既知の挙動）
  await toPng(surfaceElement, options)
  const dataUrl = await toPng(surfaceElement, options)

  downloadDataUrl(dataUrl, `${toFileName(name)}.png`)
}
