import { useState } from 'react'
import type { DragEvent } from 'react'
import { DND_TYPE, hasDragType } from '@/shared/lib/dnd'
import { useCurrentThumbnail, useEditorStore } from '@/core/store'
import { BACKGROUND_ID } from '@/core/model/types'
import { BackgroundProperties } from './BackgroundProperties'
import { LayerRow, type DropMark } from './LayerRow'

/** レイヤーの一覧。配列順に上から並べるので、一覧の下にあるものが前面になる */
export function LayerPanel() {
  const { layers } = useCurrentThumbnail()
  const selectedId = useEditorStore((s) => s.selectedId)
  const propertiesOpen = useEditorStore((s) => s.propertiesOpen)
  const select = useEditorStore((s) => s.select)
  const toggleProperties = useEditorStore((s) => s.toggleProperties)
  const addTextLayer = useEditorStore((s) => s.addTextLayer)
  const reorderLayer = useEditorStore((s) => s.reorderLayer)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropMark, setDropMark] = useState<DropMark>(null)

  const backgroundSelected = selectedId === BACKGROUND_ID
  const backgroundOpen = backgroundSelected && propertiesOpen

  /**
   * ドラッグ中の位置から挿入位置を決める。
   *
   * @param index 重なっている行の位置
   * @param event ドラッグイベント。行の上半分か下半分かで前後を決める
   */
  const handleDragOver = (index: number, event: DragEvent) => {
    if (!hasDragType(event.dataTransfer, DND_TYPE.layer)) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    setDropMark({ index, position: after ? 'after' : 'before' })
  }

  const handleDrop = () => {
    if (dragIndex !== null && dropMark) {
      const insertIndex = dropMark.position === 'after' ? dropMark.index + 1 : dropMark.index
      reorderLayer(dragIndex, insertIndex)
    }
    setDragIndex(null)
    setDropMark(null)
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <h2 className="text-xs font-bold">
          レイヤー
          <span className="ml-2 font-normal text-[10px] text-ink-sub">下が前面</span>
        </h2>
        <button
          type="button"
          onClick={addTextLayer}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-sub transition hover:border-accent hover:text-accent"
        >
          ＋ テキスト
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-2"
        onDragEnd={() => {
          setDragIndex(null)
          setDropMark(null)
        }}
      >
        <div
          className={`mb-1 overflow-hidden rounded-md border transition ${
            backgroundSelected ? 'border-accent bg-accent-soft' : 'border-transparent bg-white'
          }`}
        >
          <button
            type="button"
            aria-expanded={backgroundOpen}
            onClick={() => (backgroundSelected ? toggleProperties() : select(BACKGROUND_ID))}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-app"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-line text-[9px] font-bold text-ink-sub">
              BG
            </span>
            <span className="flex-1 truncate text-xs">背景</span>
          </button>
          {backgroundOpen && <BackgroundProperties />}
        </div>

        {/* 配列の末尾が最前面。一覧も配列順に並べるので「下が前面」になる */}
        <ul className="flex flex-col gap-1">
          {layers.map((layer, index) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              index={index}
              total={layers.length}
              dropMark={dropMark}
              onDragStart={setDragIndex}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}
