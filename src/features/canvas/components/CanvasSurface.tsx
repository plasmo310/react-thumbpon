import { useEffect, useRef } from 'react'
import { backgroundArtStyle, backgroundBaseStyle } from '@/domain/background'
import { effectsBleed, effectsFilter } from '@/domain/effects'
import { getAssetUrl } from '@/shared/lib/storage/assetRepo'
import { setSurface } from '@/shared/lib/surfaceRef'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { BACKGROUND_ID } from '@/domain/background'
import { LayerView } from './LayerView'
import styles from '../styles.module.css'
import { SelectionOverlay } from './SelectionOverlay'

const GUIDE_COLOR = '#FF3B8B'

/**
 * キャンバスの実体。内部は常に実寸座標で、表示だけ CSS transform: scale() で縮める。
 * PNG 書き出しは transform: none を渡すだけで実寸になる。
 *
 * @param props.scale 表示倍率
 */
export function CanvasSurface({ scale }: { scale: number }) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { canvas, background, layers } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)
  const guides = useEditorStore((s) => s.guides)
  const bleed = effectsBleed(background.effects)

  useEffect(() => {
    setSurface(surfaceRef.current)
    return () => setSurface(null)
  }, [])

  return (
    <>
      <div
        ref={surfaceRef}
        className={styles.surface}
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

      {/*
      選択枠はサーフェスの外に置く。サーフェスは overflow で切るため、中に入れるとキャンバスから
      はみ出したレイヤーのハンドルが見えず、掴むこともできなくなる。
      サーフェスと同じ実寸座標・同じ倍率にそろえてあるので、枠の座標計算はそのまま使える。
      書き出しの対象はサーフェスだけなので、枠が出力に混ざることもない。
    */}
      <div
        className={styles.overlay}
        style={{
          width: canvas.width,
          height: canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <SelectionOverlay scale={scale} />
      </div>
    </>
  )
}
