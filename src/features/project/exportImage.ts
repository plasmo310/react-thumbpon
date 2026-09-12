import { toPng } from 'html-to-image'
import { downloadDataUrl } from '@/shared/lib/download'
import type { CanvasSize } from '@/core/model/types'

let surfaceElement: HTMLElement | null = null

/**
 * 書き出し対象のキャンバス要素を登録する。
 * ref を props で引き回さずに済ませるため、モジュール側で参照を持つ。
 *
 * @param element キャンバスの実寸要素。アンマウント時は null を渡す
 */
export function registerSurface(element: HTMLElement | null) {
  surfaceElement = element
}

/**
 * サムネイル名をファイル名として使えるようにする。
 *
 * @param name サムネイルの名前。空になったら 'thumbpon' で代替する
 */
function toFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .trim()
  return cleaned || 'thumbpon'
}

/**
 * 現在のキャンバスを PNG として書き出す。表示は縮小されていても実寸で出力する。
 *
 * @param canvas 出力サイズ。キャンバスの実寸をそのまま渡す
 * @param name   ファイル名のもと。サムネイル名をそのまま渡す
 */
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
