import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * pointer capture を使ったドラッグセッション。
 * onMove には「押した位置からの移動量(画面px)」を渡す。
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
