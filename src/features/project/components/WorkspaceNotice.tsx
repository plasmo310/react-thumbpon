import { notifyError } from '@/shared/lib/notify'
import { reconnectProjectFolder } from '../lib/projectFolder'
import { useEditorStore } from '@/app/store'
import styles from '../styles.module.css'

/**
 * ヘッダーの下に出す細い通知帯。
 * 出す内容が無ければ何も描画しないので、通常は高さを取らない。
 */
export function WorkspaceNotice() {
  const status = useEditorStore((s) => s.workspaceStatus)
  const folderName = useEditorStore((s) => s.workspaceFolderName)
  const missingFonts = useEditorStore((s) => s.missingFontLabels)
  const setMissingFontLabels = useEditorStore((s) => s.setMissingFontLabels)
  const missingAssets = useEditorStore((s) => s.missingAssetNames)
  const setMissingAssetNames = useEditorStore((s) => s.setMissingAssetNames)

  const needsPermission = status === 'needs-permission'
  if (!needsPermission && missingFonts.length === 0 && missingAssets.length === 0) return null

  return (
    <div className={styles.notice}>
      {needsPermission && (
        <span className={styles.noticeItem}>
          前回のフォルダ「{folderName}」への権限が切れています。
          <button
            type="button"
            className={styles.noticeButton}
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
        <span className={styles.noticeItem}>
          フォント「{missingFonts.join('」「')}」が見つかりません。
          フォントファイルを追加すると元の見た目に戻ります。
          <button
            type="button"
            className={styles.noticeButton}
            onClick={() => setMissingFontLabels([])}
          >
            閉じる
          </button>
        </span>
      )}
      {missingAssets.length > 0 && (
        <span className={styles.noticeItem}>
          素材「{missingAssets.join('」「')}」の画像が見つかりません。
          それを使っていたレイヤーは枠だけで表示されます。
          <button
            type="button"
            className={styles.noticeButton}
            onClick={() => setMissingAssetNames([])}
          >
            閉じる
          </button>
        </span>
      )}
    </div>
  )
}
