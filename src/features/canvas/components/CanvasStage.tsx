import { useTranslation } from '@/shared/lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { canvasLayout, visibleThumbnails } from '@/domain/canvasLayout'
import { getSurface } from '@/shared/lib/surfaceRef'
import { NumberInput, SegmentedControl } from '@/shared/ui'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { notifyError } from '@/shared/lib/notify'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import { CanvasSurface } from './CanvasSurface'
import { useCanvasView } from '../hooks/useCanvasView'
import { useFinishTextEditing } from '../hooks/useFinishTextEditing'
import styles from '../styles.module.css'

/**
 * キャンバスを中央に置く土台。素材・画像ファイルのドロップと、右下の操作を受け持つ。
 * 表示倍率と位置の面倒は useCanvasView が見る。
 */
export function CanvasStage() {
  const t = useTranslation()

  const { canvas } = useCurrentThumbnail()
  const thumbnails = useEditorStore((s) => s.thumbnails)
  const folders = useEditorStore((s) => s.folders)
  const pinnedIds = useEditorStore((s) => s.pinnedThumbnailIds)
  const currentId = useEditorStore((s) => s.currentThumbnailId)
  const grid = useEditorStore((s) => s.gridSettings)
  const setGridSettings = useEditorStore((s) => s.setGridSettings)
  const select = useEditorStore((s) => s.select)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)

  const visible = visibleThumbnails(thumbnails, folders, pinnedIds, currentId)
  // 最初のドラッグで編集対象を変えても、ポインタを離すまでは配置と倍率を動かさない。
  const [gestureLayout, setGestureLayout] = useState<ReturnType<typeof canvasLayout> | null>(null)
  const gesture = useRef<{ x: number; y: number; text: boolean; moved: boolean } | null>(null)
  const releaseTimer = useRef<number | undefined>(undefined)
  const layout = gestureLayout ?? canvasLayout(visible, grid)
  const multiple = layout.cells.length > 1
  const resetKey = layout.cells
    .map((cell) => `${cell.id}:${cell.canvasX}:${cell.canvasY}:${cell.scale}`)
    .join(',')
  const view = useCanvasView(layout, resetKey)
  useFinishTextEditing()

  useEffect(() => {
    const clear = () => {
      window.clearTimeout(releaseTimer.current)
      setGestureLayout(null)
      gesture.current = null
    }
    const move = (event: PointerEvent) => {
      const start = gesture.current
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4)
        start.moved = true
    }
    const finish = () => {
      // 文字の最初のクリックで配置を変えると、2回目が別の場所に届きダブルクリックできない。
      if (gesture.current?.text && !gesture.current.moved) {
        window.clearTimeout(releaseTimer.current)
        releaseTimer.current = window.setTimeout(clear, 500)
      } else clear()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', clear)
    window.addEventListener('blur', clear)
    return () => {
      window.clearTimeout(releaseTimer.current)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', clear)
      window.removeEventListener('blur', clear)
    }
  }, [])

  const handleDrop = async (event: React.DragEvent) => {
    const { dataTransfer } = event
    const target = (event.target as Element).closest<HTMLElement>('[data-canvas-thumbnail]')
    const targetId = target?.dataset.canvasThumbnail ?? useEditorStore.getState().currentThumbnailId
    const surface = getSurface(targetId)
    const thumbnail = useEditorStore.getState().thumbnails.find((t) => t.id === targetId)
    if (!thumbnail) return
    const rect = surface?.getBoundingClientRect()
    const point =
      rect && target
        ? {
            x: ((event.clientX - rect.left) * thumbnail.canvas.width) / rect.width,
            y: ((event.clientY - rect.top) * thumbnail.canvas.height) / rect.height,
          }
        : undefined
    useEditorStore.getState().selectThumbnail(targetId)

    // 素材パネルからのドラッグ
    const assetId = dataTransfer.getData(DND_TYPE.asset)
    if (assetId) {
      addImageLayer(assetId, point)
      return
    }

    // OSからの画像ファイルのドロップ
    const files = Array.from(dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) return
    try {
      const added = await addAssetFiles(files)
      // 画像の読み込み中に編集対象が変わっても、ドロップ先へ追加する。
      if (!useEditorStore.getState().thumbnails.some((t) => t.id === targetId)) return
      useEditorStore.getState().selectThumbnail(targetId)
      added.forEach((asset, index) =>
        addImageLayer(
          asset.id,
          point ? { x: point.x + index * 24, y: point.y + index * 24 } : undefined,
        ),
      )
    } catch (error) {
      notifyError(t('画像の追加に失敗しました'), error)
    }
  }

  const { over, dropProps } = useDropTarget(
    [DND_TYPE.asset, DND_TYPE.files],
    (event) => void handleDrop(event),
    // キャンバスの中にレイヤーが並ぶので、そこへ移っただけで枠を消さない
    { selfOnly: true },
  )

  return (
    <div
      ref={view.stageRef}
      className={cx(
        styles.stage,
        view.spaceHeld && styles.panReady,
        view.panning && styles.panning,
      )}
      onPointerDownCapture={view.startPan}
      onMouseDown={(event) => {
        // 中ボタン押下でブラウザの自動スクロールが始まらないようにする
        if (event.button === 1) event.preventDefault()
      }}
      onPointerDown={(event) => {
        if (event.button === 0 && event.target === event.currentTarget) select(null)
      }}
      {...dropProps}
    >
      <div
        ref={view.surfaceWrapRef}
        className={styles.board}
        style={{
          width: layout.width * view.scale,
          height: layout.height * view.scale,
          transform: `translate(${view.offsetX}px, ${view.offsetY}px)`,
        }}
        onPointerDown={(event) => {
          if (event.button === 0 && event.target === event.currentTarget) select(null)
        }}
      >
        {layout.cells.map((cell) => {
          const thumbnail = thumbnails.find((t) => t.id === cell.id)
          if (!thumbnail) return null
          const scale = cell.scale * view.scale
          return (
            <div
              key={cell.id}
              data-canvas-thumbnail={cell.id}
              className={styles.cell}
              style={{
                left: cell.x * view.scale,
                top: cell.y * view.scale,
                width: cell.width * view.scale,
                height: cell.height * view.scale,
              }}
              onPointerDownCapture={(event) => {
                if (event.button !== 0) return
                window.clearTimeout(releaseTimer.current)
                gesture.current = {
                  x: event.clientX,
                  y: event.clientY,
                  moved: false,
                  text: !!(event.target as Element).closest('[data-text-layer]'),
                }
                if (currentId !== cell.id) setGestureLayout(layout)
              }}
              onPointerDown={(event) => {
                if (event.button === 0 && event.target === event.currentTarget) {
                  useEditorStore.getState().selectThumbnail(cell.id)
                  select(null)
                }
              }}
            >
              {multiple && (
                <button
                  type="button"
                  className={cx(styles.cellName, currentId === cell.id && styles.cellNameActive)}
                  title={thumbnail.name}
                  onClick={() => useEditorStore.getState().selectThumbnail(cell.id)}
                >
                  {thumbnail.name}
                </button>
              )}
              <div
                className={cx(
                  styles.surfaceWrap,
                  multiple && currentId === cell.id && styles.surfaceActive,
                )}
                style={{
                  left: (cell.canvasX - cell.x) * view.scale,
                  top: (cell.canvasY - cell.y) * view.scale,
                  width: thumbnail.canvas.width * scale,
                  height: thumbnail.canvas.height * scale,
                }}
              >
                <CanvasSurface thumbnail={thumbnail} scale={scale} />
              </div>
            </div>
          )
        })}
      </div>

      {over && <div className={styles.dropping} />}

      {multiple && (
        <div className={styles.layoutControls} data-canvas-controls>
          <SegmentedControl
            value={grid.axis}
            onChange={(axis) => setGridSettings({ ...grid, axis })}
            options={[
              { value: 'columns', label: t('列数を指定') },
              { value: 'rows', label: t('行数を指定') },
            ]}
          />
          <label className={styles.gridCount}>
            <span>{grid.axis === 'columns' ? t('列数') : t('行数')}</span>
            <NumberInput
              value={grid.count}
              min={1}
              step={1}
              onChange={(count) => setGridSettings({ ...grid, count })}
            />
          </label>
          <span>
            {t('{0}枚 ・ {1}行 × {2}列', layout.cells.length, layout.rows, layout.columns)}
          </span>
        </div>
      )}

      <div className={styles.controls} data-canvas-controls>
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          title={t(
            '他のレイヤーやキャンバス中央に吸着する（Altを押しながらドラッグで一時的に無効）',
          )}
          className={cx(styles.control, snapEnabled && styles.controlOn)}
        >
          {t('スナップ')} {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={view.resetView}
          title={t(
            '表示を画面に合わせ直す（ホイール・ピンチでズーム / 2本指スクロール・中ボタン・Space+ドラッグで移動）',
          )}
          className={cx(styles.control, view.adjusted && styles.controlAdjusted)}
        >
          {multiple
            ? t('{0}枚 ・ 全体を画面に合わせる', layout.cells.length)
            : `${canvas.width} × ${canvas.height}`}{' '}
          ・ {Math.round(view.scale * 100)}%
        </button>
      </div>
    </div>
  )
}
