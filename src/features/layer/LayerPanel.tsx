import { useState } from 'react'
import type { DragEvent } from 'react'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE, hasDragType } from '@/shared/lib/dnd'
import { Button, Panel } from '@/shared/ui'
import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { BACKGROUND_ID } from '@/domain/background'
import { BackgroundProperties } from './BackgroundProperties'
import { LayerRow } from './LayerRow'
import type { DropMark } from './types'
import styles from './styles.module.css'

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
    <Panel
      title="レイヤー"
      note="下が前面"
      divider
      actions={<Button onClick={addTextLayer}>＋ テキスト</Button>}
      body={{
        onDragEnd: () => {
          setDragIndex(null)
          setDropMark(null)
        },
      }}
    >
      <div className={cx(styles.row, styles.background, backgroundSelected && styles.rowSelected)}>
        <button
          type="button"
          aria-expanded={backgroundOpen}
          onClick={() => (backgroundSelected ? toggleProperties() : select(BACKGROUND_ID))}
          className={styles.backgroundButton}
        >
          <span className={cx(styles.badge, styles.backgroundBadge)}>BG</span>
          <span className={styles.name}>背景</span>
        </button>
        {backgroundOpen && <BackgroundProperties />}
      </div>

      {/* 配列の末尾が最前面。一覧も配列順に並べるので「下が前面」になる */}
      <ul className={styles.list}>
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
    </Panel>
  )
}
