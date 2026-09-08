import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * pointer capture を使ったドラッグセッション。
 * 要素の外にポインタが出ても追従し、pointerup / pointercancel で自動的に後始末する。
 *
 * @param event  ドラッグを開始した pointerdown イベント。currentTarget を capture 対象にする
 * @param onMove 移動のたびに呼ばれる。dx/dy は押した位置からの移動量(画面px)なので、
 *               キャンバス実寸に直すには呼び出し側で / scale する
 * @param onEnd  ドラッグ終了時に一度だけ呼ばれる
 */
export function startPointerDrag(
  event: ReactPointerEvent,
  onMove: (dx: number, dy: number, moveEvent: PointerEvent) => void,
  onEnd?: () => void,
) {
  const startX = event.clientX
  const startY = event.clientY
  const target = event.currentTarget as HTMLElement
  const pointerId = event.pointerId
  target.setPointerCapture(pointerId)

  const handleMove = (e: PointerEvent) => onMove(e.clientX - startX, e.clientY - startY, e)
  const handleUp = () => {
    target.removeEventListener('pointermove', handleMove)
    target.removeEventListener('pointerup', handleUp)
    target.removeEventListener('pointercancel', handleUp)
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
    onEnd?.()
  }

  target.addEventListener('pointermove', handleMove)
  target.addEventListener('pointerup', handleUp)
  target.addEventListener('pointercancel', handleUp)
}
