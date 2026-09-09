import { canUseFileSystemAccess } from '../../lib/storage/fsAccess'
import { useEditorStore } from '../../store'

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
      className="max-w-[200px] truncate text-[11px] text-ink-sub"
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
