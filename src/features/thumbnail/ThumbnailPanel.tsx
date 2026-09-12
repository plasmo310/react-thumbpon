import { useState } from 'react'
import { useEditorStore } from '@/app/store'
import { IconButton, InlineName, Panel } from '@/shared/ui'
import { FolderDropZone } from './FolderDropZone'
import { ThumbnailRow } from './ThumbnailRow'
import styles from './styles.module.css'

/** サムネイルとフォルダの一覧。未分類を先に、そのあとフォルダごとに並べる */
export function ThumbnailPanel() {
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
            <div className={styles.folderHeader}>
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
