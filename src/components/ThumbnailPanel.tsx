import { useState } from 'react'
import { DND_TYPE, hasDragType } from '../lib/dom/dnd'
import { useEditorStore } from '../store'
import type { Thumbnail } from '../types'
import { IconButton } from './ui/Field'

function ThumbnailRow({ thumbnail, depth }: { thumbnail: Thumbnail; depth: number }) {
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

/** フォルダ、または未分類グループにサムネイルをドロップできる領域 */
function DropZone({
  folderId,
  children,
  className,
}: {
  folderId: string | null
  children: React.ReactNode
  className?: string
}) {
  const moveThumbnailToFolder = useEditorStore((s) => s.moveThumbnailToFolder)
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        if (!hasDragType(event.dataTransfer, DND_TYPE.thumbnail)) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        const id = event.dataTransfer.getData(DND_TYPE.thumbnail)
        setOver(false)
        if (!id) return
        event.preventDefault()
        event.stopPropagation()
        moveThumbnailToFolder(id, folderId)
      }}
      className={`${className ?? ''} ${over ? 'rounded-md bg-accent-soft' : ''}`}
    >
      {children}
    </div>
  )
}

export default function ThumbnailPanel() {
  const folders = useEditorStore((s) => s.folders)
  const thumbnails = useEditorStore((s) => s.thumbnails)
  const clipboard = useEditorStore((s) => s.clipboard)
  const addThumbnail = useEditorStore((s) => s.addThumbnail)
  const pasteThumbnail = useEditorStore((s) => s.pasteThumbnail)
  const addFolder = useEditorStore((s) => s.addFolder)
  const renameFolder = useEditorStore((s) => s.renameFolder)
  const toggleFolder = useEditorStore((s) => s.toggleFolder)
  const removeFolder = useEditorStore((s) => s.removeFolder)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)

  const rootThumbnails = thumbnails.filter((t) => t.folderId === null)

  return (
    <section className="flex h-[28%] shrink-0 flex-col border-b border-line">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <h2 className="text-xs font-bold">サムネイル</h2>
        <div className="flex items-center gap-1">
          <IconButton title="サムネイルを追加" onClick={() => addThumbnail(null)}>
            ＋
          </IconButton>
          <IconButton title="フォルダを追加" onClick={addFolder}>
            📁
          </IconButton>
          {clipboard && (
            <IconButton
              title={`「${clipboard.name}」を貼り付け`}
              onClick={() => pasteThumbnail(null)}
            >
              📥
            </IconButton>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <DropZone folderId={null}>
          <ul className="flex flex-col gap-0.5">
            {rootThumbnails.map((thumbnail) => (
              <ThumbnailRow key={thumbnail.id} thumbnail={thumbnail} depth={0} />
            ))}
          </ul>
        </DropZone>

        {folders.map((folder) => {
          const children = thumbnails.filter((t) => t.folderId === folder.id)
          return (
            <DropZone key={folder.id} folderId={folder.id} className="mt-1">
              <div className="group flex items-center gap-1 rounded-md px-2 py-1 hover:bg-app">
                <button
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  className="shrink-0 text-[10px] text-ink-sub"
                >
                  {folder.collapsed ? '▶' : '▼'}
                </button>
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-accent px-1 text-xs outline-none"
                    defaultValue={folder.name}
                    onBlur={(e) => {
                      renameFolder(folder.id, e.target.value.trim() || folder.name)
                      setEditingFolderId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setEditingFolderId(null)
                    }}
                  />
                ) : (
                  <span
                    className="min-w-0 flex-1 cursor-pointer truncate text-xs font-bold"
                    onDoubleClick={() => setEditingFolderId(folder.id)}
                  >
                    {folder.name}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-ink-sub">{children.length}</span>
                <div className="hidden shrink-0 items-center group-hover:flex">
                  <IconButton
                    title="このフォルダにサムネイルを追加"
                    onClick={() => addThumbnail(folder.id)}
                  >
                    ＋
                  </IconButton>
                  {clipboard && (
                    <IconButton title="ここに貼り付け" onClick={() => pasteThumbnail(folder.id)}>
                      📥
                    </IconButton>
                  )}
                  <IconButton
                    title="フォルダを削除（中身は未分類へ）"
                    onClick={() => removeFolder(folder.id)}
                  >
                    🗑
                  </IconButton>
                </div>
              </div>

              {!folder.collapsed && (
                <ul className="flex flex-col gap-0.5">
                  {children.map((thumbnail) => (
                    <ThumbnailRow key={thumbnail.id} thumbnail={thumbnail} depth={1} />
                  ))}
                  {children.length === 0 && (
                    <li className="py-1 pl-5 text-[10px] text-ink-sub">
                      ここにドラッグして移動できます
                    </li>
                  )}
                </ul>
              )}
            </DropZone>
          )
        })}
      </div>
    </section>
  )
}
