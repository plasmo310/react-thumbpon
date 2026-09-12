import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { notifyError } from '@/shared/lib/notify'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import { CanvasSurface } from './CanvasSurface'
import { useCanvasView } from './useCanvasView'
import styles from './styles.module.css'

/**
 * キャンバスを中央に置く土台。素材・画像ファイルのドロップと、右下の操作を受け持つ。
 * 表示倍率と位置の面倒は useCanvasView が見る。
 */
export function CanvasStage() {
  const { canvas } = useCurrentThumbnail()
  const select = useEditorStore((s) => s.select)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const snapEnabled = useEditorStore((s) => s.snapEnabled)
  const setSnapEnabled = useEditorStore((s) => s.setSnapEnabled)

  const view = useCanvasView(canvas)

  const handleDrop = async (event: React.DragEvent) => {
    const { dataTransfer } = event
    const point = view.toCanvasPoint(event.clientX, event.clientY)

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
      added.forEach((asset, index) =>
        addImageLayer(
          asset.id,
          point ? { x: point.x + index * 24, y: point.y + index * 24 } : undefined,
        ),
      )
    } catch (error) {
      notifyError('画像の追加に失敗しました', error)
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
      className={cx(styles.stage, view.panning && styles.panning)}
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
        className={styles.surfaceWrap}
        style={{
          width: canvas.width * view.scale,
          height: canvas.height * view.scale,
          transform: `translate(${view.offsetX}px, ${view.offsetY}px)`,
        }}
      >
        <CanvasSurface scale={view.scale} />
      </div>

      {over && <div className={styles.dropping} />}

      <div className={styles.controls}>
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="他のレイヤーやキャンバス中央に吸着する（Altを押しながらドラッグで一時的に無効）"
          className={cx(styles.control, snapEnabled && styles.controlOn)}
        >
          スナップ {snapEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          type="button"
          onClick={view.resetView}
          title="表示を画面に合わせ直す（ホイールでズーム / 中ボタンドラッグで移動）"
          className={cx(styles.control, view.adjusted && styles.controlAdjusted)}
        >
          {canvas.width} × {canvas.height} ・ {Math.round(view.scale * 100)}%
        </button>
      </div>
    </div>
  )
}
