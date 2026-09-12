import type { ReactNode } from 'react'
import { useEditorStore } from '@/app/store'
import { cx } from '@/shared/lib/cx'
import { DND_TYPE } from '@/shared/lib/dnd'
import { useDropTarget } from '@/shared/lib/useDropTarget'
import styles from './styles.module.css'

/**
 * フォルダ、または未分類グループにサムネイルをドロップできる領域。
 *
 * @param props.folderId  移動先のフォルダ。null で未分類
 * @param props.children  この領域に並べる中身
 * @param props.className 外側に足すクラス
 */
export function FolderDropZone({
  folderId,
  children,
  className,
}: {
  folderId: string | null
  children: ReactNode
  className?: string
}) {
  const moveThumbnailToFolder = useEditorStore((s) => s.moveThumbnailToFolder)

  const { over, dropProps } = useDropTarget([DND_TYPE.thumbnail], (event) => {
    const id = event.dataTransfer.getData(DND_TYPE.thumbnail)
    if (!id) return
    // 未分類グループの上にフォルダが重なるので、内側で受けたら外側には渡さない
    event.stopPropagation()
    moveThumbnailToFolder(id, folderId)
  })

  return (
    <div {...dropProps} className={cx(className, over && styles.dropping)}>
      {children}
    </div>
  )
}
