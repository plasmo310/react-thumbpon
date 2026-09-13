import { useState } from 'react'
import type { Thumbnail } from '@/domain/thumbnail'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { IconButton, InlineName } from '@/shared/ui'
import { ThumbnailSizeRow } from './ThumbnailSizeRow'
import styles from '../styles.module.css'

/**
 * サムネイル一覧の1行。ダブルクリックで名前を編集でき、選択中はキャンバスサイズの行が開く。
 * ドラッグと選択は名前の行にだけ付ける。サイズ入力を触ったときに
 * 行ごと動いたり選択が変わったりしないようにするため。
 *
 * @param props.thumbnail 表示するサムネイル
 * @param props.depth     入れ子の深さ。フォルダ内なら 1。左の余白に使う
 */
export function ThumbnailRow({ thumbnail, depth }: { thumbnail: Thumbnail; depth: number }) {
  const currentId = useEditorStore((s) => s.currentThumbnailId)
  const selectThumbnail = useEditorStore((s) => s.selectThumbnail)
  const renameThumbnail = useEditorStore((s) => s.renameThumbnail)
  const duplicateThumbnail = useEditorStore((s) => s.duplicateThumbnail)
  const copyThumbnail = useEditorStore((s) => s.copyThumbnail)
  const removeThumbnail = useEditorStore((s) => s.removeThumbnail)
  const reorderThumbnail = useEditorStore((s) => s.reorderThumbnail)
  const canRemove = useEditorStore((s) => s.thumbnails.length > 1)
  const [editing, setEditing] = useState(false)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

  const active = currentId === thumbnail.id
  const indent = { paddingLeft: depth * 12 }

  return (
    <li className={cx(styles.row, active && styles.rowActive)}>
      <div
        draggable={!editing}
        onDragStart={(event) => {
          event.dataTransfer.setData(DND_TYPE.thumbnail, thumbnail.id)
          event.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DND_TYPE.thumbnail)) return
          event.preventDefault()
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          setDropPosition(event.clientY > rect.top + rect.height / 2 ? 'after' : 'before')
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDropPosition(null)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const id = event.dataTransfer.getData(DND_TYPE.thumbnail)
          if (id && dropPosition) reorderThumbnail(id, thumbnail.id, dropPosition)
          setDropPosition(null)
        }}
        onDragEnd={() => setDropPosition(null)}
        onClick={() => selectThumbnail(thumbnail.id)}
        onDoubleClick={() => setEditing(true)}
        style={indent}
        className={cx(
          styles.handle,
          dropPosition === 'before' && styles.dropBefore,
          dropPosition === 'after' && styles.dropAfter,
        )}
      >
        <span className={styles.icon}>▦</span>
        {editing ? (
          <InlineName
            value={thumbnail.name}
            onCommit={(name) => {
              renameThumbnail(thumbnail.id, name)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <span className={styles.name} title={thumbnail.name}>
            {thumbnail.name}
          </span>
        )}
        {/* 選択中は下のサイズ行が同じ内容を持つので、ここには出さない */}
        {!active && (
          <span className={styles.size}>
            {thumbnail.canvas.width}×{thumbnail.canvas.height}
          </span>
        )}
        <div className={styles.actions}>
          <IconButton title="複製" onClick={() => duplicateThumbnail(thumbnail.id)}>
            ⧉
          </IconButton>
          <IconButton title="コピー" onClick={() => copyThumbnail(thumbnail.id)}>
            📋
          </IconButton>
          {canRemove && (
            <IconButton title="削除" onClick={() => removeThumbnail(thumbnail.id)}>
              🗑
            </IconButton>
          )}
        </div>
      </div>

      {active && (
        <div style={indent}>
          <ThumbnailSizeRow />
        </div>
      )}
    </li>
  )
}
