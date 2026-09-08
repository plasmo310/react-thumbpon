import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { clamp } from '../../lib/core/geometry'
import { DND_TYPE, hasDragType } from '../../lib/dom/dnd'
import { notifyError } from '../../lib/dom/notify'
import { startPointerDrag } from '../../lib/dom/pointerDrag'
import { useCurrentThumbnail, useEditorStore } from '../../store'
import CanvasSurface from './CanvasSurface'

const STAGE_PADDING = 64
const MIN_SCALE = 0.05
const MAX_SCALE = 8
/** ホイールの移動量(px)あたりのズーム量。指数で効かせるので倍率は常に一定の比で変わる */
const ZOOM_SPEED = 0.0015

/** 手動でズーム・移動したときの表示状態。null の間は画面に合わせて自動で縮小する */
type View = { scale: number; x: number; y: number }

/**
 * キャンバスを中央に置く土台。表示倍率の計算と、素材・画像ファイルのドロップを受け持つ。
 * ホイールでズーム、中ボタンドラッグで移動できる。
 */
export default function CanvasStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceWrapRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)
  const [view, setView] = useState<View | null>(null)
  const [panning, setPanning] = useState(false)
  const [dropActive, setDropActive] = useState(false)

  const { canvas } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)

  const scale = view ? view.scale : fitScale
  const offsetX = view ? view.x : 0
  const offsetY = view ? view.y : 0

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
  const handlePanStart = (event: ReactPointerEvent) => {
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

  /** ドロップ位置をキャンバス実寸座標に変換する */
  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = surfaceWrapRef.current
      if (!wrap) return undefined
      const rect = wrap.getBoundingClientRect()
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
    },
    [scale],
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      const { dataTransfer } = event
      const point = toCanvasPoint(event.clientX, event.clientY)
      setDropActive(false)

      // 素材パネルからのドラッグ
      const assetId = dataTransfer.getData(DND_TYPE.asset)
      if (assetId) {
        event.preventDefault()
        addImageLayer(assetId, point)
        return
      }

      // OSからの画像ファイルのドロップ
      const files = Array.from(dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      event.preventDefault()
      try {
        const added = await addAssetFiles(files)
        added.forEach((asset, index) =>
          addImageLayer(
            asset.id,
            point ? { x: point.x + index * 24, y: point.y + index * 24 } : undefined,
          ),
        )
      } catch (error) {
        notifyError('画像の追加に失敗しました', error)
      }
    },
    [addAssetFiles, addImageLayer, toCanvasPoint],
  )

  const acceptsDrag = (event: React.DragEvent) =>
    hasDragType(event.dataTransfer, DND_TYPE.asset, DND_TYPE.files)

  return (
    <div
      ref={stageRef}
      className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-stage ${
        panning ? 'cursor-grabbing' : ''
      }`}
      onPointerDownCapture={handlePanStart}
      onMouseDown={(event) => {
        // 中ボタン押下でブラウザの自動スクロールが始まらないようにする
        if (event.button === 1) event.preventDefault()
      }}
      onPointerDown={(event) => {
        if (event.button === 0 && event.target === event.currentTarget) select(null)
      }}
      onDragOver={(event) => {
        if (!acceptsDrag(event)) return
        event.preventDefault()
        setDropActive(true)
      }}
      onDragLeave={(event) => {
        if (event.target === event.currentTarget) setDropActive(false)
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      <div
        ref={surfaceWrapRef}
        className="relative shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
      >
        <CanvasSurface scale={scale} />
      </div>

      {dropActive && (
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-accent bg-accent-soft/40" />
      )}

      <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] text-ink-sub">
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="他のレイヤーやキャンバス中央に吸着する（Altを押しながらドラッグで一時的に無効）"
          className={`rounded-md border px-2 py-1 transition ${
            snapEnabled
              ? 'border-accent bg-accent-soft text-accent-hover'
              : 'border-line bg-white hover:border-accent'
          }`}
        >
          スナップ {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={() => setView(null)}
          title="表示を画面に合わせ直す（ホイールでズーム / 中ボタンドラッグで移動）"
          className={`rounded-md border bg-white px-2 py-1 transition hover:border-accent ${
            view ? 'border-accent text-accent-hover' : 'border-line'
          }`}
        >
          {canvas.width} × {canvas.height} ・ {Math.round(scale * 100)}%
        </button>
      </div>
    </div>
  )
}
