import { useState } from 'react'
import type { ReactNode } from 'react'
import { DND_TYPE, hasDragType } from '@/shared/lib/dnd'
import { useEditorStore } from '@/core/store'

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
