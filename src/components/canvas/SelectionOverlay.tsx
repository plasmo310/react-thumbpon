import { useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  HANDLES,
  angleFromCenter,
  isCornerHandle,
  normalizeAngle,
  resizeRect,
  snapAngle,
  type Handle,
} from '@/core/model/geometry'
import { startPointerDrag } from '@/lib/dom/pointerDrag'
import { useEditorStore, useSelectedLayer } from '@/core/store'
import { useLayerHeight } from './useLayerHeight'

const ACCENT = '#FF8A5B'
const HANDLE_SIZE = 10
const ROTATE_OFFSET = 28

const HANDLE_POSITION: Record<Handle, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  e: { left: '100%', top: '50%' },
  se: { left: '100%', top: '100%' },
  s: { left: '50%', top: '100%' },
  sw: { left: '0%', top: '100%' },
  w: { left: '0%', top: '50%' },
}

const HANDLE_CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

/** テキストは高さが内容依存なので上下ハンドルは出さない */
const TEXT_HANDLES: Handle[] = ['nw', 'ne', 'se', 'sw', 'e', 'w']

/**
 * 選択中のレイヤーに重ねる枠・リサイズハンドル・回転ハンドル。
 * 書き出しには含めないため data-export-ignore を付けている。
 *
 * @param props.scale 表示倍率。枠やハンドルが倍率によらず同じ太さに見えるよう実寸に割り戻す
 */
export default function SelectionOverlay({ scale }: { scale: number }) {
  const layer = useSelectedLayer()
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const overlayRef = useRef<HTMLDivElement>(null)
  const height = useLayerHeight(layer)

  if (!layer || !layer.visible || layer.locked) return null

  /** ハンドルや枠線が拡大率によらず同じ太さに見えるよう、実寸に割り戻す */
  const px = (value: number) => value / scale

  const startResize = (handle: Handle) => (event: ReactPointerEvent) => {
    event.stopPropagation()
    const start = { x: layer.x, y: layer.y, width: layer.width, height: Math.max(height, 1) }
    const startFontSize = layer.type === 'text' ? layer.fontSize : 0
    const corner = isCornerHandle(handle)

    startPointerDrag(event, (dx, dy, moveEvent) => {
      const isText = layer.type === 'text'
      // テキストのコーナーは常に比例スケール、画像は Shift でアスペクト維持
      const keepAspect = isText ? corner : moveEvent.shiftKey
      const rect = resizeRect(start, layer.rotation, handle, dx / scale, dy / scale, keepAspect)
      const common = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
      }
      if (!isText) {
        updateLayer(layer.id, { ...common, height: Math.round(rect.height) })
        return
      }
      if (corner) {
        const factor = rect.width / start.width
        updateLayer(layer.id, {
          ...common,
          fontSize: Math.max(4, Math.round(startFontSize * factor)),
        })
      } else {
        updateLayer(layer.id, { x: common.x, y: common.y, width: common.width })
      }
    })
  }

  const startRotate = (event: ReactPointerEvent) => {
    event.stopPropagation()
    const box = overlayRef.current?.getBoundingClientRect()
    if (!box) return
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const startAngle = angleFromCenter(cx, cy, event.clientX, event.clientY)
    const startRotation = layer.rotation

    startPointerDrag(event, (_dx, _dy, moveEvent) => {
      const delta = angleFromCenter(cx, cy, moveEvent.clientX, moveEvent.clientY) - startAngle
      const next = moveEvent.shiftKey
        ? snapAngle(startRotation + delta)
        : Math.round(startRotation + delta)
      updateLayer(layer.id, { rotation: normalizeAngle(next) })
    })
  }

  const handles = layer.type === 'text' ? TEXT_HANDLES : HANDLES

  const handleStyle = (handle: Handle): CSSProperties => ({
    position: 'absolute',
    left: HANDLE_POSITION[handle].left,
    top: HANDLE_POSITION[handle].top,
    width: px(HANDLE_SIZE),
    height: px(HANDLE_SIZE),
    marginLeft: px(-HANDLE_SIZE / 2),
    marginTop: px(-HANDLE_SIZE / 2),
    background: '#fff',
    border: `${px(1.5)}px solid ${ACCENT}`,
    borderRadius: px(2),
    cursor: HANDLE_CURSOR[handle],
    pointerEvents: 'auto',
    touchAction: 'none',
  })

  return (
    <div
      ref={overlayRef}
      data-export-ignore="true"
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: Math.max(height, 1),
        transform: `rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, border: `${px(1.5)}px solid ${ACCENT}` }} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: px(-ROTATE_OFFSET),
          width: px(1.5),
          height: px(ROTATE_OFFSET),
          marginLeft: px(-0.75),
          background: ACCENT,
        }}
      />
      <div
        onPointerDown={startRotate}
        title="回転（Shiftで15度スナップ）"
        style={{
          position: 'absolute',
          left: '50%',
          top: px(-ROTATE_OFFSET),
          width: px(HANDLE_SIZE + 2),
          height: px(HANDLE_SIZE + 2),
          marginLeft: px(-(HANDLE_SIZE + 2) / 2),
          marginTop: px(-(HANDLE_SIZE + 2) / 2),
          background: '#fff',
          border: `${px(1.5)}px solid ${ACCENT}`,
          borderRadius: '50%',
          cursor: 'grab',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />
      {handles.map((handle) => (
        <div key={handle} onPointerDown={startResize(handle)} style={handleStyle(handle)} />
      ))}
    </div>
  )
}
