import type { DragEvent } from 'react'
import { DND_TYPE } from '@/shared/lib/dnd'
import { useEditorStore } from '@/core/store'
import type { Layer } from '@/core/model/types'
import { LayerProperties } from '../properties/LayerProperties'
import { EyeIcon, EyeOffIcon, IconButton } from '@/shared/ui'

/** ドラッグ中に挿入位置を示す線を、どの行のどちら側に出すか */
export type DropMark = { index: number; position: 'before' | 'after' } | null

/**
 * レイヤー一覧の1行。選択中は操作ボタンとプロパティ欄をその場に開く。
 * 選択中の行をもう一度押すと畳める（選択は保ったまま一覧を見渡せるように）。
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

  const selected = selectedId === layer.id
  const open = selected && propertiesOpen

  /** 未選択なら選ぶ、選択中ならプロパティ欄を開閉する */
  const handleActivate = () => {
    if (selected) toggleProperties()
    else select(layer.id)
  }

  const markBefore = dropMark?.index === index && dropMark.position === 'before'
  const markAfter = dropMark?.index === index && dropMark.position === 'after'

  return (
    <li
      className={`overflow-hidden rounded-md border transition ${
        selected ? 'border-accent bg-accent-soft' : 'border-transparent bg-white hover:bg-app'
      } ${markBefore ? 'border-t-2 border-t-accent' : ''} ${
        markAfter ? 'border-b-2 border-b-accent' : ''
      }`}
      onDragOver={(event) => onDragOver(index, event)}
      onDrop={(event) => {
        event.preventDefault()
        onDrop()
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
        className="flex w-full cursor-grab items-center gap-2 px-2 py-1.5 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
            layer.type === 'text' ? 'bg-accent text-white' : 'bg-line text-ink-sub'
          }`}
        >
          {layer.type === 'text' ? 'T' : 'I'}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-xs ${
            layer.visible ? 'text-ink' : 'text-ink-sub line-through'
          }`}
        >
          {layer.name}
        </span>
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
          <div className="flex items-center gap-1 border-t border-line bg-app px-2 py-1">
            <IconButton title="背面へ" onClick={() => moveLayer(layer.id, -1)} active={index > 0}>
              ↑
            </IconButton>
            <IconButton
              title="前面へ"
              onClick={() => moveLayer(layer.id, 1)}
              active={index < total - 1}
            >
              ↓
            </IconButton>
            <IconButton title="複製" onClick={() => duplicateLayer(layer.id)}>
              ⧉
            </IconButton>
            <div className="flex-1" />
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
