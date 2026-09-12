import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { clamp } from '@/core/model/geometry'
import type { CanvasSize } from '@/core/model/types'
import { startPointerDrag } from '@/shared/lib/pointerDrag'

const STAGE_PADDING = 64
const MIN_SCALE = 0.05
const MAX_SCALE = 8
/** ホイールの移動量(px)あたりのズーム量。指数で効かせるので倍率は常に一定の比で変わる */
const ZOOM_SPEED = 0.0015

/** 手動でズーム・移動したときの表示状態。null の間は画面に合わせて自動で縮小する */
type View = { scale: number; x: number; y: number }

/**
 * キャンバスの見え方（表示倍率と位置）だけを受け持つ。
 * 何も操作していない間は画面に収まるよう自動で縮小し、
 * ホイールでズーム、中ボタンドラッグで移動すると手動の状態に切り替わる。
 *
 * @param canvas キャンバスの実寸。これが変わったら手動の状態は捨てて合わせ直す
 */
export function useCanvasView(canvas: CanvasSize) {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceWrapRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [view, setView] = useState<View | null>(null)
  const [panning, setPanning] = useState(false)

  const scale = view ? view.scale : fitScale

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    // キャンバスの大きさが変わったら手動のズーム・移動は捨てて画面に合わせ直す
    setView(null)
    const update = () => {
      const next = Math.min(
        (element.clientWidth - STAGE_PADDING) / canvas.width,
        (element.clientHeight - STAGE_PADDING) / canvas.height,
        1,
      )
      setFitScale(Math.max(MIN_SCALE, next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [canvas.width, canvas.height])

  /**
   * カーソルの下にある実寸座標を動かさずに倍率だけ変える。
   *
   * @param clientX カーソルの画面X座標
   * @param clientY カーソルの画面Y座標
   * @param factor  現在の倍率に掛ける比率
   */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const stage = stageRef.current
      const wrap = surfaceWrapRef.current
      if (!stage || !wrap) return
      const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
      if (next === scale) return

      const rect = wrap.getBoundingClientRect()
      const pointX = (clientX - rect.left) / scale
      const pointY = (clientY - rect.top) / scale
      // 移動量は中央寄せされた位置からのずれとして持つので、新しい倍率での中央位置を先に出す
      const stageRect = stage.getBoundingClientRect()
      const centeredLeft = stageRect.left + (stage.clientWidth - canvas.width * next) / 2
      const centeredTop = stageRect.top + (stage.clientHeight - canvas.height * next) / 2
      setView({
        scale: next,
        x: clientX - pointX * next - centeredLeft,
        y: clientY - pointY * next - centeredTop,
      })
    },
    [canvas.height, canvas.width, scale],
  )

  // React の onWheel は passive で登録されて preventDefault が効かないため、自前で登録する
  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      // 行単位・ページ単位で来るブラウザがあるので px に揃える
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
      zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * unit * ZOOM_SPEED))
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [zoomAt])

  /** 中ボタンドラッグでの移動。レイヤーのドラッグより先に捕まえたいので capture 側で受ける */
  const startPan = (event: ReactPointerEvent) => {
    if (event.button !== 1) return
    event.stopPropagation()
    const start = view ?? { scale, x: 0, y: 0 }
    setPanning(true)
    startPointerDrag(
      event,
      (dx, dy) => setView({ scale: start.scale, x: start.x + dx, y: start.y + dy }),
      () => setPanning(false),
    )
  }

  /**
   * 画面上の位置をキャンバス実寸座標に直す。
   *
   * @param clientX 画面X座標
   * @param clientY 画面Y座標
   * @returns まだ描かれていなければ undefined
   */
  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = surfaceWrapRef.current
      if (!wrap) return undefined
      const rect = wrap.getBoundingClientRect()
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
    },
    [scale],
  )

  return {
    stageRef,
    surfaceWrapRef,
    scale,
    offsetX: view ? view.x : 0,
    offsetY: view ? view.y : 0,
    panning,
    /** 手動でズーム・移動したあとか。表示を戻すボタンを目立たせるのに使う */
    adjusted: view !== null,
    resetView: () => setView(null),
    startPan,
    toCanvasPoint,
  }
}
