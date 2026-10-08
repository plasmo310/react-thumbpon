import { useTranslation } from '@/shared/lib/i18n'
import { useEditorStore } from '@/app/store'
import { visibleThumbnails } from '@/domain/canvasLayout'
import { useAsyncAction } from '@/shared/lib/useAsyncAction'
import { exportPngs } from '../lib/exportImage'
import styles from '../styles.module.css'

/**
 * Canvas に表示中のサムネイルを PNG として書き出す。複数表示中は表示中の全枚をまとめて出す。
 * 書き出し中は二重押しを防ぐ。
 */
export function ExportButton() {
  const t = useTranslation()

  const thumbnails = useEditorStore((s) => s.thumbnails)
  const folders = useEditorStore((s) => s.folders)
  const pinnedIds = useEditorStore((s) => s.pinnedThumbnailIds)
  const currentId = useEditorStore((s) => s.currentThumbnailId)
  const { busy, run } = useAsyncAction()

  const visible = visibleThumbnails(thumbnails, folders, pinnedIds, currentId)

  return (
    <button
      type="button"
      onClick={() => void run(t('書き出しに失敗しました'), () => exportPngs(visible))}
      disabled={busy}
      className={styles.export}
    >
      {busy
        ? t('書き出し中…')
        : visible.length > 1
          ? t('PNG書き出し（{0}枚）', visible.length)
          : t('PNG書き出し')}
    </button>
  )
}
