import type { ReactNode } from 'react'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import { useAssetImport } from '../hooks/useAssetImport'
import styles from '../styles.module.css'

/**
 * フォルダ、または未分類グループに素材を落とせる領域。
 * 素材タイルのドラッグはそのフォルダへの移動、OSからのファイルはそのフォルダへの取り込みになる。
 *
 * @param props.folderId  移動・取り込み先のフォルダ。null で未分類
 * @param props.children  この領域に並べる中身
 * @param props.className 外側に足すクラス
 */
export function AssetFolderZone({
  folderId,
  children,
  className,
}: {
  folderId: string | null
  children: ReactNode
  className?: string
}) {
  const moveAssetToFolder = useEditorStore((s) => s.moveAssetToFolder)
  const { importFiles } = useAssetImport()

  const { over, dropProps } = useDropTarget([DND_TYPE.asset, DND_TYPE.files], (event) => {
    // 未分類グループの上にフォルダが重なるので、内側で受けたら外側には渡さない
    event.stopPropagation()
    const id = event.dataTransfer.getData(DND_TYPE.asset)
    if (id) {
      void moveAssetToFolder(id, folderId)
      return
    }
    void importFiles(event.dataTransfer.files, folderId)
  })

  return (
    <div
      {...dropProps}
      // パネル全体のハイライトと二重にならないよう、ここで受けている間は外へ渡さない
      onDragOver={(event) => {
        dropProps.onDragOver(event)
        event.stopPropagation()
      }}
      className={cx(className, over && styles.dropping)}
    >
      {children}
    </div>
  )
}
