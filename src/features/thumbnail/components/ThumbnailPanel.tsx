import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { IconButton, InlineName, Panel } from '@/shared/ui'
import { FolderDropZone } from './FolderDropZone'
import { ThumbnailRow } from './ThumbnailRow'
import styles from '../styles.module.css'

const FOLDER_DRAG_THRESHOLD = 6

/** サムネイルとフォルダの一覧。未分類を先に、そのあとフォルダごとに並べる */
export function ThumbnailPanel() {
  const folders = useEditorStore((s) => s.folders)
  const thumbnails = useEditorStore((s) => s.thumbnails)
  const clipboard = useEditorStore((s) => s.clipboard)
  const addThumbnail = useEditorStore((s) => s.addThumbnail)
  const pasteThumbnail = useEditorStore((s) => s.pasteThumbnail)
  const addFolder = useEditorStore((s) => s.addFolder)
  const renameFolder = useEditorStore((s) => s.renameFolder)
  const reorderFolder = useEditorStore((s) => s.reorderFolder)
  const toggleFolder = useEditorStore((s) => s.toggleFolder)
  const removeFolder = useEditorStore((s) => s.removeFolder)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderDrop, setFolderDrop] = useState<{
    id: string
    position: 'before' | 'after'
  } | null>(null)
  const folderGesture = useRef<{
    id: string
    pointerId: number
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)
  const folderDropRef = useRef<{ id: string; position: 'before' | 'after' } | null>(null)

  const resetFolderGesture = () => {
    folderGesture.current = null
    folderDropRef.current = null
    setFolderDrop(null)
  }

  const handleFolderPointerDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button, input')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    folderGesture.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    }
  }

  const handleFolderPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = folderGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!gesture.dragging) {
      const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
      if (distance < FOLDER_DRAG_THRESHOLD) return
      gesture.dragging = true
    }

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(
      '[data-folder-id]',
    )
    if (!target || target.dataset.folderId === gesture.id) {
      folderDropRef.current = null
      setFolderDrop(null)
      return
    }
    const rect = target.getBoundingClientRect()
    const drop = {
      id: target.dataset.folderId!,
      position: event.clientY > rect.top + rect.height / 2 ? ('after' as const) : ('before' as const),
    }
    folderDropRef.current = drop
    setFolderDrop(drop)
  }

  const handleFolderPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = folderGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.dragging) {
      const drop = folderDropRef.current
      if (drop) reorderFolder(gesture.id, drop.id, drop.position)
    } else {
      toggleFolder(gesture.id)
    }
    resetFolderGesture()
  }

  const rootThumbnails = thumbnails.filter((t) => t.folderId === null)

  return (
    <Panel
      title="サムネイル"
      actions={
        <>
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
        </>
      }
    >
      <FolderDropZone folderId={null}>
        <ul className={styles.list}>
          {rootThumbnails.map((thumbnail) => (
            <ThumbnailRow key={thumbnail.id} thumbnail={thumbnail} depth={0} />
          ))}
        </ul>
      </FolderDropZone>

      {folders.map((folder) => {
        const children = thumbnails.filter((t) => t.folderId === folder.id)
        return (
          <FolderDropZone key={folder.id} folderId={folder.id} className={styles.folderGroup}>
            <div
              data-folder-id={folder.id}
              onPointerDown={(event) => handleFolderPointerDown(folder.id, event)}
              onPointerMove={handleFolderPointerMove}
              onPointerUp={handleFolderPointerUp}
              onPointerCancel={resetFolderGesture}
              className={cx(
                styles.folderHeader,
                folderDrop?.id === folder.id &&
                  folderDrop.position === 'before' &&
                  styles.folderDropBefore,
                folderDrop?.id === folder.id &&
                  folderDrop.position === 'after' &&
                  styles.folderDropAfter,
              )}
            >
              <button
                type="button"
                onClick={() => toggleFolder(folder.id)}
                className={styles.folderToggle}
              >
                {folder.collapsed ? '▶' : '▼'}
              </button>
              {editingFolderId === folder.id ? (
                <InlineName
                  value={folder.name}
                  onCommit={(name) => {
                    renameFolder(folder.id, name)
                    setEditingFolderId(null)
                  }}
                  onCancel={() => setEditingFolderId(null)}
                />
              ) : (
                <span
                  className={styles.folderName}
                  onDoubleClick={() => setEditingFolderId(folder.id)}
                >
                  {folder.name}
                </span>
              )}
              <span className={styles.folderCount}>{children.length}</span>
              <div className={styles.actions}>
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
              <ul className={styles.list}>
                {children.map((thumbnail) => (
                  <ThumbnailRow key={thumbnail.id} thumbnail={thumbnail} depth={1} />
                ))}
                {children.length === 0 && (
                  <li className={styles.folderEmpty}>ここにドラッグして移動できます</li>
                )}
              </ul>
            )}
          </FolderDropZone>
        )
      })}
    </Panel>
  )
}
