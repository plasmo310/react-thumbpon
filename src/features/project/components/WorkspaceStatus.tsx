import { canUseFileSystemAccess } from '@/shared/lib/storage/fsAccess'
import { useEditorStore } from '@/app/store'
import styles from '../styles.module.css'

/**
 * 今どのフォルダを正本として作業しているかの表示。
 * 操作ではなく状態なので、ファイル操作の段ではなくヘッダー1段目に置く。
 */
export function WorkspaceStatus() {
  const status = useEditorStore((s) => s.workspaceStatus)
  const folderName = useEditorStore((s) => s.workspaceFolderName)
  const dirty = useEditorStore((s) => s.workspaceDirty)

  if (!canUseFileSystemAccess() || status !== 'connected' || !folderName) return null

  return (
    <span
      className={styles.workspace}
      title={
        dirty
          ? `ワークスペース: ${folderName}（未保存の変更があります）`
          : `ワークスペース: ${folderName}`
      }
    >
      {dirty ? '● ' : ''}
      {folderName}
    </span>
  )
}
