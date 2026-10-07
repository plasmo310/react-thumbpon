import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { classifyWheel, wheelDeltaPx } from '@/domain/canvasWheel'
import { clamp } from '@/domain/geometry'
import type { CanvasSize } from '@/domain/thumbnail'
import { isTyping } from '@/shared/lib/isTyping'
import { startPointerDrag } from '@/shared/lib/pointerDrag'

const STAGE_PADDING = 64
const MIN_SCALE = 0.05
const MAX_SCALE = 8
/** ホイールの移動量(px)あたりのズーム量。指数で効かせるので倍率は常に一定の比で変わる */
const ZOOM_SPEED = 0.0015
/** トラックパッドのピンチ1pxあたりのズーム量。ピンチは移動量が小さく届くのでホイールより大きくする */
const PINCH_ZOOM_SPEED = 0.01

/** 手動でズーム・移動したときの表示状態。null の間は画面に合わせて自動で縮小する */
type View = { scale: number; x: number; y: number }

/** Safari だけが送るピンチのイベント。標準の型定義にないので使う値だけ定義する */
type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number }

/**
 * キャンバスの見え方（表示倍率と位置）だけを受け持つ。
 * 何も操作していない間は画面に収まるよう自動で縮小し、
 * マウスホイール・ピンチでズーム、トラックパッドの2本指スクロール・中ボタンドラッグ・
 * Space を押しながらのドラッグで移動すると手動の状態に切り替わる。
 *
 * @param canvas キャンバスの実寸。これが変わったら手動の状態は捨てて合わせ直す
 * @param resetKey 表示対象や配置が変わったことを示すキー
 */
export function useCanvasView(canvas: CanvasSize, resetKey = '') {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceWrapRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [view, setView] = useState<View | null>(null)
  const [panning, setPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

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
      setFitScale(Math.max(0.001, next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [canvas.width, canvas.height, resetKey])

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
      const next = clamp(scale * factor, Math.min(MIN_SCALE, fitScale), MAX_SCALE)
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
    [canvas.height, canvas.width, scale, fitScale],
  )

  // React の onWheel は passive で登録されて preventDefault が効かないため、自前で登録する
  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const handleWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-canvas-controls]')) return
      event.preventDefault()
      const dx = wheelDeltaPx(event.deltaX, event.deltaMode)
      const dy = wheelDeltaPx(event.deltaY, event.deltaMode)
      if (classifyWheel(event) === 'pan') {
        setView((prev) => {
          const start = prev ?? { scale: fitScale, x: 0, y: 0 }
          return { scale: start.scale, x: start.x - dx, y: start.y - dy }
        })
        return
      }
      const speed = event.ctrlKey ? PINCH_ZOOM_SPEED : ZOOM_SPEED
      zoomAt(event.clientX, event.clientY, Math.exp(-dy * speed))
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [zoomAt, fitScale])

  // Safari はピンチを wheel ではなく独自の gesture イベントで送る。止めないとページごと拡大される
  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    let lastScale = 1
    const handleStart = (event: Event) => {
      event.preventDefault()
      lastScale = 1
    }
    const handleChange = (event: Event) => {
      event.preventDefault()
      const { scale: gestureScale, clientX, clientY } = event as GestureEvent
      zoomAt(clientX, clientY, gestureScale / lastScale)
      lastScale = gestureScale
    }
    element.addEventListener('gesturestart', handleStart, { passive: false })
    element.addEventListener('gesturechange', handleChange, { passive: false })
    return () => {
      element.removeEventListener('gesturestart', handleStart)
      element.removeEventListener('gesturechange', handleChange)
    }
  }, [zoomAt])

  // Space を押している間は左ドラッグで移動できる。中ボタンのないトラックパッド向け
  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTyping(event.target)) return
      // ページのスクロールやフォーカス中のボタンの押下を起こさない
      event.preventDefault()
      if (!event.repeat) setSpaceHeld(true)
    }
    const handleUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (!isTyping(event.target)) event.preventDefault()
      setSpaceHeld(false)
    }
    const release = () => setSpaceHeld(false)
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', release)
    }
  }, [])

  /**
   * 中ボタンドラッグ、または Space を押しながらの左ドラッグでの移動。
   * レイヤーのドラッグより先に捕まえたいので capture 側で受ける
   */
  const startPan = (event: ReactPointerEvent) => {
    if (event.button !== 1 && !(event.button === 0 && spaceHeld)) return
    event.stopPropagation()
    const start = view ?? { scale, x: 0, y: 0 }
    setPanning(true)
    startPointerDrag(
      event,
      (dx, dy) => setView({ scale: start.scale, x: start.x + dx, y: start.y + dy }),
      () => setPanning(false),
    )
  }

  return {
    stageRef,
    surfaceWrapRef,
    scale,
    offsetX: view ? view.x : 0,
    offsetY: view ? view.y : 0,
    panning,
    /** Space を押していて、左ドラッグで移動できる状態か */
    spaceHeld,
    /** 手動でズーム・移動したあとか。表示を戻すボタンを目立たせるのに使う */
    adjusted: view !== null,
    resetView: () => setView(null),
    startPan,
  }
}
