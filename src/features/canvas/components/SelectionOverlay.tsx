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
} from '@/domain/geometry'
import { cropByHandle, cropImageStyle } from '@/domain/crop'
import { imageFrameStyle } from '@/domain/layer'
import { getAssetUrl } from '@/shared/lib/storage/assetRepo'
import { startPointerDrag } from '@/shared/lib/pointerDrag'
import { useCurrentThumbnail, useEditorStore, useSelectedLayer } from '@/app/store'
import { useLayerHeight } from '../hooks/useLayerHeight'
import { measureLayerHeight } from '../lib/layerRect'

const ACCENT = '#FF8A5B'
/* クロップ中は枠の意味が変わる（掴むと中身が切れる）ので、色も変えて区別する */
const CROP_ACCENT = '#3B82F6'
/* 切り落とされる部分を薄く出す濃さ。同じ画像を重ねるので、残る部分の見た目は変わらない */
const CROP_GHOST_OPACITY = 0.3
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
 * キャンバスからはみ出たレイヤーも操作できるよう、切り抜くサーフェスの外に置かれる。
 * 書き出し対象のサーフェスの外にあるので、書き出しには含まれない。
 *
 * クロップ編集中は同じハンドルの意味が変わり、枠のリサイズではなく
 * 画像の表示範囲を詰める操作になる（中身は動かさない）。
 *
 * @param props.scale 表示倍率。枠やハンドルが倍率によらず同じ太さに見えるよう実寸に割り戻す
 */
export function SelectionOverlay({ scale }: { scale: number }) {
  const layer = useSelectedLayer()
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const { layers } = useCurrentThumbnail()
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const updateLayerCrop = useEditorStore((s) => s.updateLayerCrop)
  const cropping = useEditorStore((s) => s.cropping)
  const overlayRef = useRef<HTMLDivElement>(null)
  const height = useLayerHeight(layer)

  /** ハンドルや枠線が拡大率によらず同じ太さに見えるよう、実寸に割り戻す */
  const px = (value: number) => value / scale

  // 複数選択中は動かす・削除するだけの対象なので、リサイズや回転のハンドルは出さず
  // どれが選ばれているか分かる枠だけを重ねる
  if (selectedIds.length > 1) {
    return (
      <>
        {selectedIds.map((id) => {
          const target = layers.find((l) => l.id === id)
          if (!target || !target.visible) return null
          const boxHeight = target.type === 'text' ? measureLayerHeight(target.id) : target.height
          return (
            <div
              key={id}
              style={{
                position: 'absolute',
                left: target.x,
                top: target.y,
                width: target.width,
                height: Math.max(boxHeight, 1),
                transform: `rotate(${target.rotation}deg)`,
                transformOrigin: 'center',
                border: `${px(1.5)}px solid ${ACCENT}`,
                pointerEvents: 'none',
              }}
            />
          )
        })}
      </>
    )
  }

  if (!layer || !layer.visible || layer.locked) return null

  const image = cropping && layer.type === 'image' ? layer : null
  const accent = image ? CROP_ACCENT : ACCENT

  const startResize = (handle: Handle) => (event: ReactPointerEvent) => {
    event.stopPropagation()
    const start = { x: layer.x, y: layer.y, width: layer.width, height: Math.max(height, 1) }
    const startFontSize = layer.type === 'text' ? layer.fontSize : 0
    const corner = isCornerHandle(handle)
    let historyCommitted = false

    startPointerDrag(event, (dx, dy, moveEvent) => {
      if (!historyCommitted) {
        historyCommitted = true
        useEditorStore.getState().recordHistory()
      }
      const isText = layer.type === 'text'
      // テキストのコーナーは常に比例スケール。画像・図形は Shift でアスペクトを維持する
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

  const startCrop = (handle: Handle) => (event: ReactPointerEvent) => {
    if (!image) return
    event.stopPropagation()
    const start = { x: image.x, y: image.y, width: image.width, height: image.height }
    const from = image.crop
    let historyCommitted = false

    startPointerDrag(event, (dx, dy) => {
      if (!historyCommitted) {
        historyCommitted = true
        useEditorStore.getState().recordHistory()
      }
      const next = cropByHandle(start, from, image.rotation, handle, dx / scale, dy / scale)
      updateLayerCrop(image.id, next.crop, {
        x: Math.round(next.rect.x),
        y: Math.round(next.rect.y),
        width: Math.round(next.rect.width),
        height: Math.round(next.rect.height),
      })
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
    let historyCommitted = false

    startPointerDrag(event, (_dx, _dy, moveEvent) => {
      if (!historyCommitted) {
        historyCommitted = true
        useEditorStore.getState().recordHistory()
      }
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
    border: `${px(1.5)}px solid ${accent}`,
    borderRadius: px(2),
    cursor: HANDLE_CURSOR[handle],
    pointerEvents: 'auto',
    touchAction: 'none',
  })

  return (
    <div
      ref={overlayRef}
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
      {/* 切り落とされる部分。同じ画像を薄く重ねるので、残る部分の見た目は変わらない */}
      {image && (
        <div style={imageFrameStyle(image)}>
          <img
            src={getAssetUrl(image.assetId)}
            alt=""
            draggable={false}
            style={{
              ...cropImageStyle(image.crop),
              opacity: CROP_GHOST_OPACITY,
              objectFit: 'fill',
            }}
          />
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, border: `${px(1.5)}px solid ${accent}` }} />

      {/* クロップ中は回転させない。掴む辺の向きが変わって操作が分かりにくくなるため */}
      {!image && (
        <>
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
        </>
      )}

      {handles.map((handle) => (
        <div
          key={handle}
          title={image ? 'ドラッグで表示範囲を詰める' : undefined}
          onPointerDown={image ? startCrop(handle) : startResize(handle)}
          style={handleStyle(handle)}
        />
      ))}
    </div>
  )
}
