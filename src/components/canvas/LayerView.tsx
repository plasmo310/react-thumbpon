import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { getAssetUrl } from '../../lib/assetStore'
import { startPointerDrag } from '../../lib/pointerDrag'
import { useEditorStore } from '../../store/editorStore'
import type { Layer } from '../../types/editor'

export default function LayerView({ layer, scale }: { layer: Layer; scale: number }) {
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)

  if (!layer.visible) return null

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (layer.locked || event.button !== 0) return
    event.stopPropagation()
    select(layer.id)
    const startX = layer.x
    const startY = layer.y
    startPointerDrag(event, (dx, dy, moveEvent) => {
      let x = startX + dx / scale
      let y = startY + dy / scale
      if (moveEvent.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) y = startY
        else x = startX
      }
      updateLayer(layer.id, { x: Math.round(x), y: Math.round(y) })
    })
  }

  const base: CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: 'center',
    pointerEvents: layer.locked ? 'none' : 'auto',
    cursor: layer.locked ? 'default' : 'move',
  }

  if (layer.type === 'image') {
    const url = getAssetUrl(layer.assetId)
    return (
      <div
        data-layer-id={layer.id}
        style={{ ...base, height: layer.height }}
        onPointerDown={handlePointerDown}
      >
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: '2px dashed #FF8A5B',
              background: '#FFF1EB',
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      data-layer-id={layer.id}
      style={{
        ...base,
        color: layer.color,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textAlign: layer.textAlign,
        letterSpacing: `${layer.letterSpacing}px`,
        lineHeight: layer.lineHeight,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      onPointerDown={handlePointerDown}
    >
      {layer.text}
    </div>
  )
}
