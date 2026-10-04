import { useTranslation } from '@/shared/lib/i18n'
import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import type { AssetFolder } from '@/domain/asset'
import { assetFolderAncestors } from '@/domain/asset'
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
  const t = useTranslation()

  const assets = useEditorStore((s) => s.assets)
  const folders = useEditorStore((s) => s.assetFolders)
  const addAssetFolder = useEditorStore((s) => s.addAssetFolder)
  const renameAssetFolder = useEditorStore((s) => s.renameAssetFolder)
  const reorderAssetFolder = useEditorStore((s) => s.reorderAssetFolder)
  const moveAssetFolder = useEditorStore((s) => s.moveAssetFolder)
  const toggleAssetFolder = useEditorStore((s) => s.toggleAssetFolder)
  const removeAssetFolder = useEditorStore((s) => s.removeAssetFolder)
  const { importFiles } = useAssetImport()
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [folderDrop, setFolderDrop] = useState<{
    id: string
    position: 'before' | 'after' | 'inside'
  } | null>(null)
  const folderGesture = useRef<{
    id: string
    pointerId: number
    startX: number
    startY: number
    dragging: boolean
    onName: boolean
  } | null>(null)
  const folderDropRef = useRef<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null)

  const resetFolderGesture = () => {
    folderGesture.current = null
    folderDropRef.current = null
    setFolderDrop(null)
  }

  const handleFolderPointerDown = (id: string, event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    if (event.button !== 0 || target.closest('button, input')) return
    folderGesture.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      onName: target.closest('[data-folder-name]') !== null,
    }
  }

  const handleFolderPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = folderGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (!gesture.dragging) {
      const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
      if (distance < FOLDER_DRAG_THRESHOLD) return
      gesture.dragging = true
      // 押した時点で捕捉すると click / dblclick がヘッダーに付け替わり、名前のダブルクリックが効かなくなる
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-asset-folder-id]')
    if (!target || target.dataset.assetFolderId === gesture.id) {
      folderDropRef.current = null
      setFolderDrop(null)
      return
    }
    const rect = target.getBoundingClientRect()
    const ratio = (event.clientY - rect.top) / rect.height
    const position: 'before' | 'after' | 'inside' =
      ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'
    const targetFolder = folders.find((folder) => folder.id === target.dataset.assetFolderId)
    const parentId = position === 'inside' ? targetFolder?.id : targetFolder?.parentId
    if (
      assetFolderAncestors(parentId ?? null, folders).some((folder) => folder.id === gesture.id)
    ) {
      folderDropRef.current = null
      setFolderDrop(null)
      return
    }
    const drop = {
      id: target.dataset.assetFolderId!,
      position,
    }
    folderDropRef.current = drop
    setFolderDrop(drop)
  }

  const handleFolderPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = folderGesture.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.dragging) {
      const drop = folderDropRef.current
      if (drop?.position === 'inside') void moveAssetFolder(gesture.id, drop.id)
      else if (drop) void reorderAssetFolder(gesture.id, drop.id, drop.position)
    } else if (!gesture.onName) {
      // 名前はダブルクリックで編集するので、クリックでは開閉しない
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

  const renderFolder = (folder: AssetFolder): ReactNode => {
    const children = assets.filter((a) => a.folderId === folder.id)
    const childFolders = folders.filter((child) => child.parentId === folder.id)
    return (
      <AssetFolderZone key={folder.id} folderId={folder.id} className={styles.folderGroup}>
        <div
          data-asset-folder-id={folder.id}
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
            folderDrop?.id === folder.id && folderDrop.position === 'inside' && styles.dropping,
          )}
        >
          <button
            type="button"
            title={folder.collapsed ? t('フォルダを開く') : t('フォルダを閉じる')}
            aria-expanded={!folder.collapsed}
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
              data-folder-name
              className={styles.folderName}
              title={t('ダブルクリックで名前を変更。ドラッグで並べ替え・フォルダ内へ移動')}
              onDoubleClick={() => setEditingFolderId(folder.id)}
            >
              {folder.name}
            </span>
          )}
          <span className={styles.folderCount}>{children.length}</span>
          <div className={styles.folderActions}>
            <IconButton title={t('このフォルダに素材を追加')} onClick={() => openPicker(folder.id)}>
              ＋
            </IconButton>
            <IconButton
              title={t('子フォルダを追加')}
              onClick={() => void addAssetFolder(folder.id)}
            >
              📁
            </IconButton>
            {folder.parentId && (
              <IconButton
                title={t('最上位へ移動')}
                onClick={() => void moveAssetFolder(folder.id, null)}
              >
                ↑
              </IconButton>
            )}
            <IconButton
              title={t('フォルダと子フォルダを削除（素材は未分類へ）')}
              onClick={() => void removeAssetFolder(folder.id)}
            >
              🗑
            </IconButton>
          </div>
        </div>
        {!folder.collapsed && (
          <div className={styles.folderContents}>
            {children.length > 0 && (
              <div className={styles.grid}>
                {children.map((asset) => (
                  <AssetTile key={asset.id} asset={asset} />
                ))}
              </div>
            )}
            {childFolders.map(renderFolder)}
            {children.length === 0 && childFolders.length === 0 && (
              <p className={styles.folderEmpty}>{t('ここにドラッグして移動できます')}</p>
            )}
          </div>
        )}
      </AssetFolderZone>
    )
  }

  return (
    <Panel
      title={t('素材')}
      section={{ ...dropProps, className: cx(over && styles.dropping) }}
      actions={
        <>
          <span className={styles.count}>{t('{0}件', assets.length)}</span>
          <IconButton title={t('素材を追加')} onClick={() => openPicker(null)}>
            ＋
          </IconButton>
          <IconButton title={t('フォルダを追加')} onClick={() => void addAssetFolder()}>
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
            {t('＋ 追加')}
          </button>
        </div>
      </AssetFolderZone>

      {folders.filter((folder) => folder.parentId == null).map(renderFolder)}

      {assets.length === 0 && (
        <p className={styles.empty}>{t('画像をここにドロップしても追加できます')}</p>
      )}

      {picker.element}
    </Panel>
  )
}
