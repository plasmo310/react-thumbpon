import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { getAssetUrl } from '@/core/storage/assetRepo'
import { startPointerDrag } from '@/shared/lib/pointerDrag'
import { effectsFilter } from '@/core/model/style'
import { snapPosition } from '@/core/model/snap'
import { collectLayerRects, measureLayerHeight } from '@/shared/lib/layerRect'
import { useCurrentThumbnail, useEditorStore } from '@/core/store'
import type { Layer } from '@/core/model/types'

/** 画面上でのスナップ距離(px) */
const SNAP_THRESHOLD = 8

/**
 * キャンバス上に置かれたレイヤー1つ。座標もサイズも実寸で書き、表示の縮小は親が行う。
 *
 * @param props.layer 描画するレイヤー
 * @param props.scale 表示倍率。ポインタの移動量を実寸に直すのと、スナップ距離の換算に使う
 */
export default function LayerView({ layer, scale }: { layer: Layer; scale: number }) {
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setGuides = useEditorStore((s) => s.setGuides)
  const { canvas } = useCurrentThumbnail()

  if (!layer.visible) return null

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (layer.locked || event.button !== 0) return
    event.stopPropagation()
    select(layer.id)
    const startX = layer.x
    const startY = layer.y

    // スナップ用に、他レイヤーの矩形と自分の実寸をドラッグ開始時に一度だけ集める
    const surface = (event.currentTarget as HTMLElement).offsetParent as HTMLElement | null
    const height = measureLayerHeight(layer.id)
    const targets = surface ? collectLayerRects(surface, layer.id) : []
    // 回転していると矩形が合わないのでスナップしない
    const canSnap = snapEnabled && layer.rotation === 0

    startPointerDrag(
      event,
      (dx, dy, moveEvent) => {
        let x = startX + dx / scale
        let y = startY + dy / scale
        if (moveEvent.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) y = startY
          else x = startX
        }

        if (canSnap && !moveEvent.altKey) {
          const snapped = snapPosition(
            { x, y, width: layer.width, height },
            targets,
            canvas,
            SNAP_THRESHOLD / scale,
          )
          x = snapped.x
          y = snapped.y
          setGuides({ x: snapped.guidesX, y: snapped.guidesY })
        }

        updateLayer(layer.id, { x: Math.round(x), y: Math.round(y) })
      },
      () => setGuides({ x: [], y: [] }),
    )
  }

  const base: CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    // ブラー・影・光彩。影は矩形ではなく中身の形に沿わせたいので drop-shadow を使う
    filter: effectsFilter(layer.effects),
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
        // 縁取り。paint-order で文字の外側に描かせる
        WebkitTextStrokeWidth: layer.strokeWidth > 0 ? `${layer.strokeWidth}px` : undefined,
        WebkitTextStrokeColor: layer.strokeColor,
        paintOrder: 'stroke fill',
      }}
      onPointerDown={handlePointerDown}
    >
      {layer.text}
    </div>
  )
}
