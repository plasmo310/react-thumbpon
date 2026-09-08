import { useCallback, useEffect, useRef, useState } from 'react'
import { DND_TYPE, hasDragType } from '../../lib/dom/dnd'
import { notifyError } from '../../lib/dom/notify'
import { useCurrentThumbnail, useEditorStore } from '../../store/editorStore'
import CanvasSurface from './CanvasSurface'

const STAGE_PADDING = 64

export default function CanvasStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceWrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [dropActive, setDropActive] = useState(false)

  const { canvas } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const update = () => {
      const next = Math.min(
        (element.clientWidth - STAGE_PADDING) / canvas.width,
        (element.clientHeight - STAGE_PADDING) / canvas.height,
        1,
      )
      setScale(Math.max(0.05, next))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [canvas.width, canvas.height])

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
      className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-stage"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(null)
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
        style={{ width: canvas.width * scale, height: canvas.height * scale }}
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
        <span className="pointer-events-none">
          {canvas.width} × {canvas.height} ・ {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  )
}
