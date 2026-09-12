import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { snapPosition } from '../lib/snap'
import { cropImageStyle } from '@/domain/crop'
import { imageFrameStyle, layerStyle, textStyle } from '@/domain/layer'
import type { Layer } from '@/domain/layer'
import { getAssetUrl } from '@/shared/lib/storage/assetRepo'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { collectLayerRects, measureLayerHeight } from '../lib/layerRect'
import { startPointerDrag } from '@/shared/lib/pointerDrag'

/** 画面上でのスナップ距離(px) */
const SNAP_THRESHOLD = 8

/*
 * 素材が見つからないときの代わり。キャンバスの中に直接描く色は Tailwind の外なので、
 * トークンではなくここに定数として置く（書き出しにもそのまま乗る）。
 */
const MISSING_BORDER = '#FF8A5B'
const MISSING_FILL = '#FFF1EB'

/**
 * キャンバス上に置かれたレイヤー1つ。座標もサイズも実寸で書き、表示の縮小は親が行う。
 * 右クリックではレイヤー一覧と同じメニューを出す（中身は `app/LayerMenu` が持つ）。
 *
 * @param props.layer 描画するレイヤー
 * @param props.scale 表示倍率。ポインタの移動量を実寸に直すのと、スナップ距離の換算に使う
 */
export function LayerView({ layer, scale }: { layer: Layer; scale: number }) {
  const select = useEditorStore((s) => s.select)
  const openLayerMenu = useEditorStore((s) => s.openLayerMenu)
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

  /*
   * メニューの位置は画面座標で決まるので、キャンバスの実寸座標には直さず clientX/Y をそのまま渡す。
   * ロック中のレイヤーは pointer-events を切ってあるので、ここには来ない。
   */
  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    openLayerMenu(layer.id, event.clientX, event.clientY)
  }

  const base = layerStyle(layer)

  if (layer.type === 'image') {
    const url = getAssetUrl(layer.assetId)
    return (
      // クロップすると画像が枠より大きくなるので、枠の外に出た分はここで切る
      <div
        data-layer-id={layer.id}
        style={{ ...base, overflow: 'hidden' }}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      >
        {url ? (
          // 反転は枠いっぱいの層に掛ける。クロップ後の見た目がそのまま鏡像になる
          <div style={imageFrameStyle(layer)}>
            <img
              src={url}
              alt=""
              draggable={false}
              style={{
                ...cropImageStyle(layer.crop),
                objectFit: 'fill',
                display: 'block',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px dashed ${MISSING_BORDER}`,
              background: MISSING_FILL,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      data-layer-id={layer.id}
      style={{ ...base, ...textStyle(layer) }}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
    >
      {layer.text}
    </div>
  )
}
