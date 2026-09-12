import { useEffect, useRef } from 'react'
import { backgroundArtStyle, backgroundBaseStyle } from '@/core/model/style'
import { effectsBleed, effectsFilter } from '@/core/model/style'
import { getAssetUrl } from '@/core/storage/assetRepo'
import { registerSurface } from '../../services/exportImage'
import { useCurrentThumbnail, useEditorStore } from '@/core/store'
import { BACKGROUND_ID } from '@/core/model/types'
import LayerView from './LayerView'
import SelectionOverlay from './SelectionOverlay'

const GUIDE_COLOR = '#FF3B8B'

/**
 * キャンバスの実体。内部は常に実寸座標で、表示だけ CSS transform: scale() で縮める。
 * PNG 書き出しは transform: none を渡すだけで実寸になる。
 *
 * @param props.scale 表示倍率
 */
export default function CanvasSurface({ scale }: { scale: number }) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { canvas, background, layers } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)
  const guides = useEditorStore((s) => s.guides)
  const bleed = effectsBleed(background.effects)

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
        ...backgroundBaseStyle(background),
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(BACKGROUND_ID)
      }}
    >
      {/*
        下地色とは別の層に絵柄を置く。エフェクトはこの層だけに掛けたいため
        （サーフェス自体に filter を掛けるとレイヤーまで一緒にぼける）。
        ぼかすと縁が透けるので、その分だけ外側にはみ出させて overflow で切る。
      */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -bleed,
          top: -bleed,
          right: -bleed,
          bottom: -bleed,
          pointerEvents: 'none',
          filter: effectsFilter(background.effects),
          ...backgroundArtStyle(background, getAssetUrl(background.assetId) ?? null),
        }}
      />

      {layers.map((layer) => (
        <LayerView key={layer.id} layer={layer} scale={scale} />
      ))}
      <SelectionOverlay scale={scale} />

      {guides.x.map((x) => (
        <div
          key={`gx-${x}`}
          data-export-ignore="true"
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            height: canvas.height,
            width: Math.max(1, 1 / scale),
            background: GUIDE_COLOR,
            pointerEvents: 'none',
          }}
        />
      ))}
      {guides.y.map((y) => (
        <div
          key={`gy-${y}`}
          data-export-ignore="true"
          style={{
            position: 'absolute',
            top: y,
            left: 0,
            width: canvas.width,
            height: Math.max(1, 1 / scale),
            background: GUIDE_COLOR,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  )
}
