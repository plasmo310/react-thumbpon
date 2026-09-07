import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getAssetUrl } from '../../lib/assetStore'
import { registerSurface } from '../../lib/exportImage'
import { useCurrentThumbnail, useEditorStore } from '../../store/editorStore'
import { BACKGROUND_ID, type Background } from '../../types/editor'
import LayerView from './LayerView'
import SelectionOverlay from './SelectionOverlay'

function backgroundStyle(background: Background): CSSProperties {
  if (background.type === 'gradient') {
    return {
      backgroundImage: `linear-gradient(${background.gradientAngle}deg, ${background.gradientFrom}, ${background.gradientTo})`,
    }
  }
  if (background.type === 'image') {
    const url = getAssetUrl(background.assetId)
    if (!url) return { backgroundColor: background.color }
    return {
      backgroundColor: background.color,
      backgroundImage: `url(${url})`,
      backgroundSize: background.fit,
      backgroundPosition: background.position,
      backgroundRepeat: 'no-repeat',
    }
  }
  return { backgroundColor: background.color }
}

export default function CanvasSurface({ scale }: { scale: number }) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { canvas, background, layers } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)

  useEffect(() => {
    registerSurface(surfaceRef.current)
    return () => registerSurface(null)
  }, [])

  return (
    <div
      ref={surfaceRef}
      className="absolute left-0 top-0 overflow-hidden"
      style={{
        width: canvas.width,
        height: canvas.height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        ...backgroundStyle(background),
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(BACKGROUND_ID)
      }}
    >
      {layers.map((layer) => (
        <LayerView key={layer.id} layer={layer} scale={scale} />
      ))}
      <SelectionOverlay scale={scale} />
    </div>
  )
}
