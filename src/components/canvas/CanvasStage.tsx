import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { ASSET_DND_TYPE } from '../AssetPanel'
import CanvasSurface from './CanvasSurface'

const STAGE_PADDING = 64

export default function CanvasStage() {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceWrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const canvas = useEditorStore((s) => s.canvas)
  const select = useEditorStore((s) => s.select)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)

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

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const assetId = event.dataTransfer.getData(ASSET_DND_TYPE)
      if (!assetId) return
      event.preventDefault()
      const wrap = surfaceWrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      addImageLayer(assetId, {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      })
    },
    [addImageLayer, scale],
  )

  return (
    <div
      ref={stageRef}
      className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-stage"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(null)
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(ASSET_DND_TYPE)) event.preventDefault()
      }}
      onDrop={handleDrop}
    >
      <div
        ref={surfaceWrapRef}
        className="relative shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        style={{ width: canvas.width * scale, height: canvas.height * scale }}
      >
        <CanvasSurface scale={scale} />
      </div>
      <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-ink-sub">
        {canvas.width} × {canvas.height} ・ {Math.round(scale * 100)}%
      </div>
    </div>
  )
}
