import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '@/shared/lib/i18n'
import type { Handle } from '@/domain/geometry'
import {
  cornerPoints,
  dragFactor,
  factorFloor,
  groupBounds,
  scaleGroup,
  snapFactor,
  type GroupItem,
} from '@/domain/groupScale'
import { startPointerDrag } from '@/shared/lib/pointerDrag'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { SNAP_THRESHOLD } from '../lib/snap'
import { collectLayerRects, findLayerElement } from '../lib/layerRect'

const ACCENT = '#FF8A5B'
const HANDLE_SIZE = 10
const CORNERS: Handle[] = ['nw', 'ne', 'se', 'sw']
const CORNER_POSITION: Record<string, { left: string; top: string; cursor: string }> = {
  nw: { left: '0%', top: '0%', cursor: 'nwse-resize' },
  ne: { left: '100%', top: '0%', cursor: 'nesw-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
  sw: { left: '0%', top: '100%', cursor: 'nesw-resize' },
}

/**
 * 複数選択をひとまとめに拡大縮小するための外接枠と四隅のハンドル。
 * 縦横比は常に保ち、掴んだ角の対角を動かさない。スナップはキャンバスの端・中央と、選択外のレイヤーの端・中央に効く。
 *
 * @param props.items 拡縮できる対象（表示中でロックされていないもの）。2 件以上のとき呼ぶ
 * @param props.scale 表示倍率。枠線やハンドルが倍率によらず同じ太さに見えるよう実寸に割り戻す
 */
export function GroupScaleBox({ items, scale }: { items: GroupItem[]; scale: number }) {
  const t = useTranslation()
  const canvas = useCurrentThumbnail()?.canvas
  const box = groupBounds(items)
  if (!box || !canvas) return null
  const px = (value: number) => value / scale

  const startScale = (handle: Handle) => (event: ReactPointerEvent) => {
    event.stopPropagation()
    const store = useEditorStore.getState()
    const { anchor } = cornerPoints(box, handle)
    const floor = factorFloor(items)
    const surface = findLayerElement(items[0].layer.id)?.offsetParent as HTMLElement | null
    const targets = surface
      ? collectLayerRects(
          surface,
          items.map((item) => item.layer.id),
        )
      : []
    const linesX = [0, canvas.width / 2, canvas.width]
    const linesY = [0, canvas.height / 2, canvas.height]
    for (const target of targets) {
      linesX.push(target.x, target.x + target.width / 2, target.x + target.width)
      linesY.push(target.y, target.y + target.height / 2, target.y + target.height)
    }
    let historyCommitted = false

    startPointerDrag(
      event,
      (dx, dy, moveEvent) => {
        if (!historyCommitted) {
          historyCommitted = true
          store.recordHistory()
        }
        let factor = dragFactor(box, handle, dx / scale, dy / scale, floor)
        if (store.snapEnabled && !moveEvent.altKey) {
          const snapped = snapFactor(
            box,
            handle,
            factor,
            linesX,
            linesY,
            SNAP_THRESHOLD / scale,
            floor,
          )
          factor = snapped.factor
          store.setGuides({ x: snapped.guidesX, y: snapped.guidesY })
        } else {
          store.setGuides({ x: [], y: [] })
        }
        scaleGroup(items, anchor, factor).forEach((patch, id) => store.updateLayer(id, patch))
      },
      () => store.setGuides({ x: [], y: [] }),
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        border: `${px(1)}px dashed ${ACCENT}`,
        pointerEvents: 'none',
      }}
    >
      {CORNERS.map((handle) => (
        <div
          key={handle}
          onPointerDown={startScale(handle)}
          title={t('まとめて拡大縮小（Altでスナップを一時無効）')}
          style={{
            position: 'absolute',
            left: CORNER_POSITION[handle].left,
            top: CORNER_POSITION[handle].top,
            width: px(HANDLE_SIZE),
            height: px(HANDLE_SIZE),
            marginLeft: px(-HANDLE_SIZE / 2),
            marginTop: px(-HANDLE_SIZE / 2),
            background: '#fff',
            border: `${px(1.5)}px solid ${ACCENT}`,
            borderRadius: px(2),
            cursor: CORNER_POSITION[handle].cursor,
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        />
      ))}
    </div>
  )
}
