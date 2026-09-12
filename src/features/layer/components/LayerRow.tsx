import type { DragEvent } from 'react'
import type { Layer } from '@/domain/layer'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { EyeIcon, EyeOffIcon, IconButton } from '@/shared/ui'
import { LayerProperties } from './LayerProperties'
import type { DropMark } from '../types'
import styles from '../styles.module.css'

/**
 * レイヤー一覧の1行。選択中は操作ボタンとプロパティ欄をその場に開く。
 * 選択中の行をもう一度押すと畳める（選択は保ったまま一覧を見渡せるように）。
 * 右クリックでは重なり順の変更を含むメニューを出す（中身は `app/LayerMenu` が持つ）。
 *
 * ドラッグは名前の行にだけ付ける。行全体に付けると、開いたプロパティ欄の
 * スライダーを掴んだだけで HTML5 のドラッグが始まり、値を変えられなくなるため。
 * 落とす先は行全体のままにして、プロパティを開いていても並べ替えられるようにする。
 *
 * @param props.layer       表示するレイヤー
 * @param props.index       配列内の位置。0 が最背面
 * @param props.total       レイヤーの総数。前面・背面ボタンの端判定に使う
 * @param props.dropMark    現在の挿入位置。自分の行に該当するときだけ線を出す
 * @param props.onDragStart 並べ替えを開始した位置を親に伝える
 * @param props.onDragOver  ドラッグ中の位置を親に伝える
 * @param props.onDrop      ドロップされたことを親に伝える
 */
export function LayerRow({
  layer,
  index,
  total,
  dropMark,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  layer: Layer
  index: number
  total: number
  dropMark: DropMark
  onDragStart: (index: number) => void
  onDragOver: (index: number, event: DragEvent) => void
  onDrop: () => void
}) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const propertiesOpen = useEditorStore((s) => s.propertiesOpen)
  const select = useEditorStore((s) => s.select)
  const toggleProperties = useEditorStore((s) => s.toggleProperties)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const removeLayer = useEditorStore((s) => s.removeLayer)
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer)
  const moveLayer = useEditorStore((s) => s.moveLayer)
  const openLayerMenu = useEditorStore((s) => s.openLayerMenu)

  const selected = selectedId === layer.id
  const open = selected && propertiesOpen
  const isText = layer.type === 'text'
  const isFront = index === total - 1
  const isBack = index === 0

  /** 未選択なら選ぶ、選択中ならプロパティ欄を開閉する */
  const handleActivate = () => {
    if (selected) toggleProperties()
    else select(layer.id)
  }

  const mark = dropMark?.index === index ? dropMark.position : null

  return (
    <li
      className={cx(
        styles.row,
        selected && styles.rowSelected,
        mark === 'before' && styles.markBefore,
        mark === 'after' && styles.markAfter,
      )}
      onDragOver={(event) => onDragOver(index, event)}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        openLayerMenu(layer.id, event.clientX, event.clientY)
      }}
    >
      {/* 行内にボタンを含むため button ではなく div にする */}
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DND_TYPE.layer, String(index))
          event.dataTransfer.effectAllowed = 'move'
          onDragStart(index)
        }}
        aria-expanded={open}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleActivate()
        }}
        className={styles.handle}
      >
        <span className={cx(styles.badge, isText && styles.badgeText)}>{isText ? 'T' : 'I'}</span>
        <span className={cx(styles.name, !layer.visible && styles.nameHidden)}>{layer.name}</span>
        <IconButton
          title={layer.visible ? '非表示にする' : '表示する'}
          onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
          active={!layer.visible}
        >
          {layer.visible ? <EyeIcon /> : <EyeOffIcon />}
        </IconButton>
        <IconButton
          title={layer.locked ? 'ロック解除' : 'ロック'}
          onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
          active={layer.locked}
        >
          {layer.locked ? '🔒' : '🔓'}
        </IconButton>
      </div>

      {open && (
        <>
          <div className={styles.actions}>
            <IconButton
              title="背面へ（右クリックで最背面まで送れる）"
              onClick={() => moveLayer(layer.id, 'backward')}
              active={!isBack}
            >
              ↑
            </IconButton>
            <IconButton
              title="前面へ（右クリックで最前面まで送れる）"
              onClick={() => moveLayer(layer.id, 'forward')}
              active={!isFront}
            >
              ↓
            </IconButton>
            <IconButton title="複製" onClick={() => duplicateLayer(layer.id)}>
              ⧉
            </IconButton>
            <div className={styles.spacer} />
            <IconButton title="削除" onClick={() => removeLayer(layer.id)}>
              🗑
            </IconButton>
          </div>
          <LayerProperties layer={layer} />
        </>
      )}
    </li>
  )
}
