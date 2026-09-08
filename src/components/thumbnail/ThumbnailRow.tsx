import { useState } from 'react'
import { DND_TYPE } from '../../lib/dom/dnd'
import { useEditorStore } from '../../store'
import type { Thumbnail } from '../../types'
import { IconButton } from '../ui'

/**
 * サムネイル一覧の1行。ダブルクリックで名前を編集できる。
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
  const canRemove = useEditorStore((s) => s.thumbnails.length > 1)
  const [editing, setEditing] = useState(false)

  const active = currentId === thumbnail.id

  return (
    <li
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.setData(DND_TYPE.thumbnail, thumbnail.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => selectThumbnail(thumbnail.id)}
      onDoubleClick={() => setEditing(true)}
      style={{ paddingLeft: depth * 12 }}
      className={`group flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 transition ${
        active ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-app'
      }`}
    >
      <span className="shrink-0 text-[10px] text-ink-sub">▦</span>
      {editing ? (
        <input
          autoFocus
          className="min-w-0 flex-1 rounded border border-accent px-1 text-xs outline-none"
          defaultValue={thumbnail.name}
          onBlur={(e) => {
            renameThumbnail(thumbnail.id, e.target.value.trim() || thumbnail.name)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs" title={thumbnail.name}>
          {thumbnail.name}
        </span>
      )}
      <span className="shrink-0 text-[10px] text-ink-sub">
        {thumbnail.canvas.width}×{thumbnail.canvas.height}
      </span>
      <div className="hidden shrink-0 items-center group-hover:flex">
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
    </li>
  )
}
