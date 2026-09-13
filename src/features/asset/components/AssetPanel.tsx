import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import { IconButton, InlineName, Panel, useFilePicker } from '@/shared/ui'
import { AssetFolderZone } from './AssetFolderZone'
import { AssetTile } from './AssetTile'
import { useAssetImport } from '../hooks/useAssetImport'
import styles from '../styles.module.css'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml'
const FOLDER_DRAG_THRESHOLD = 6

/**
 * 取り込んだ素材の一覧。キャンバスへのドラッグ元でもある。
 * 未分類を先に、そのあとフォルダごとに並べる（サムネイル一覧と同じ形）。
 * フォルダ分けはプロジェクトを書き出したときの assets/ 配下の構成にもなる。
 */
export function AssetPanel() {
  const assets = useEditorStore((s) => s.assets)
  const folders = useEditorStore((s) => s.assetFolders)
  const addAssetFolder = useEditorStore((s) => s.addAssetFolder)
  const renameAssetFolder = useEditorStore((s) => s.renameAssetFolder)
  const reorderAssetFolder = useEditorStore((s) => s.reorderAssetFolder)
  const toggleAssetFolder = useEditorStore((s) => s.toggleAssetFolder)
  const removeAssetFolder = useEditorStore((s) => s.removeAssetFolder)
  const { importFiles } = useAssetImport()
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
      if (drop) void reorderAssetFolder(gesture.id, drop.id, drop.position)
    } else {
      void toggleAssetFolder(gesture.id)
    }
    resetFolderGesture()
  }

  // 取り込み先は「＋」を押した場所で決まる。ダイアログを開いたあとに読むので ref で持つ
  const targetFolderId = useRef<string | null>(null)
  const picker = useFilePicker(
    ACCEPT,
    (files) => void importFiles(files, targetFolderId.current),
    true,
  )
  const openPicker = (folderId: string | null) => {
    targetFolderId.current = folderId
    picker.open()
  }

  // パネルのどこに落としても未分類に取り込めるようにする。フォルダの上ではそちらが受ける
  const { over, dropProps } = useDropTarget(
    [DND_TYPE.files],
    (event) => void importFiles(event.dataTransfer.files, null),
  )

  const rootAssets = assets.filter((a) => a.folderId === null)

  return (
    <Panel
      title="素材"
      section={{ ...dropProps, className: cx(over && styles.dropping) }}
      actions={
        <>
          <span className={styles.count}>{assets.length}件</span>
          <IconButton title="素材を追加" onClick={() => openPicker(null)}>
            ＋
          </IconButton>
          <IconButton title="フォルダを追加" onClick={() => void addAssetFolder()}>
            📁
          </IconButton>
        </>
      }
    >
      <AssetFolderZone folderId={null}>
        <div className={styles.grid}>
          {rootAssets.map((asset) => (
            <AssetTile key={asset.id} asset={asset} />
          ))}
          <button type="button" onClick={() => openPicker(null)} className={styles.add}>
            ＋ 追加
          </button>
        </div>
      </AssetFolderZone>

      {folders.map((folder) => {
        const children = assets.filter((a) => a.folderId === folder.id)
        return (
          <AssetFolderZone key={folder.id} folderId={folder.id} className={styles.folderGroup}>
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
                onClick={() => void toggleAssetFolder(folder.id)}
                className={styles.folderToggle}
              >
                {folder.collapsed ? '▶' : '▼'}
              </button>
              {editingFolderId === folder.id ? (
                <InlineName
                  value={folder.name}
                  onCommit={(name) => {
                    void renameAssetFolder(folder.id, name)
                    setEditingFolderId(null)
                  }}
                  onCancel={() => setEditingFolderId(null)}
                />
              ) : (
                <span
                  className={styles.folderName}
                  title="ダブルクリックで名前を変える（書き出し先のフォルダ名になる）"
                  onDoubleClick={() => setEditingFolderId(folder.id)}
                >
                  {folder.name}
                </span>
              )}
              <span className={styles.folderCount}>{children.length}</span>
              <div className={styles.folderActions}>
                <IconButton title="このフォルダに素材を追加" onClick={() => openPicker(folder.id)}>
                  ＋
                </IconButton>
                <IconButton
                  title="フォルダを削除（中身は未分類へ）"
                  onClick={() => void removeAssetFolder(folder.id)}
                >
                  🗑
                </IconButton>
              </div>
            </div>

            {!folder.collapsed &&
              (children.length > 0 ? (
                <div className={styles.grid}>
                  {children.map((asset) => (
                    <AssetTile key={asset.id} asset={asset} />
                  ))}
                </div>
              ) : (
                <p className={styles.folderEmpty}>ここにドラッグして移動できます</p>
              ))}
          </AssetFolderZone>
        )
      })}

      {assets.length === 0 && (
        <p className={styles.empty}>画像をここにドロップしても追加できます</p>
      )}

      {picker.element}
    </Panel>
  )
}
