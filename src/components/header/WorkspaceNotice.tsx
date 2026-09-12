import { notifyError } from '@/shared/lib/notify'
import { reconnectProjectFolder } from '../../services/projectFolder'
import { useEditorStore } from '@/core/store'

const noticeBar =
  'flex items-center gap-3 border-b border-line bg-panel px-5 py-1.5 text-[11px] text-ink-sub'

const noticeButton =
  'rounded border border-accent px-2 py-0.5 text-[11px] text-accent transition hover:bg-accent hover:text-white'

/**
 * ヘッダーの下に出す細い通知帯。
 * 出す内容が無ければ何も描画しないので、通常は高さを取らない。
 */
export function WorkspaceNotice() {
  const status = useEditorStore((s) => s.workspaceStatus)
  const folderName = useEditorStore((s) => s.workspaceFolderName)
  const missingFonts = useEditorStore((s) => s.missingFontLabels)
  const setMissingFontLabels = useEditorStore((s) => s.setMissingFontLabels)

  const needsPermission = status === 'needs-permission'
  if (!needsPermission && missingFonts.length === 0) return null

  return (
    <div className={noticeBar}>
      {needsPermission && (
        <span className="flex items-center gap-2">
          前回のフォルダ「{folderName}」への権限が切れています。
          <button
            type="button"
            className={noticeButton}
            onClick={() =>
              void reconnectProjectFolder().catch((error) =>
                notifyError('再接続に失敗しました', error),
              )
            }
          >
            再接続
          </button>
        </span>
      )}
      {missingFonts.length > 0 && (
        <span className="flex items-center gap-2">
          フォント「{missingFonts.join('」「')}」が見つかりません。
          フォントファイルを追加すると元の見た目に戻ります。
          <button type="button" className={noticeButton} onClick={() => setMissingFontLabels([])}>
            閉じる
          </button>
        </span>
      )}
    </div>
  )
}
