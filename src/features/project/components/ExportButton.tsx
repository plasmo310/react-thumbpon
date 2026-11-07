import { useState } from 'react'
import { useTranslation } from '@/shared/lib/i18n'
import { useEditorStore } from '@/app/store'
import { visibleThumbnails } from '@/domain/canvasLayout'
import { useAsyncAction } from '@/shared/lib/useAsyncAction'
import type { Thumbnail } from '@/domain/thumbnail'
import { exportPngs } from '../lib/exportImage'
import { ExportDialog } from './ExportDialog'
import styles from '../styles.module.css'

/**
 * Canvas に表示中のサムネイルを PNG として書き出す。
 * 表示中が1枚ならそのまま書き出し、2枚以上なら選ぶダイアログを挟む（全部でも1枚でも選べる）。
 * 書き出し中は二重押しを防ぐ。
 */
export function ExportButton() {
  const t = useTranslation()

  const thumbnails = useEditorStore((s) => s.thumbnails)
  const folders = useEditorStore((s) => s.folders)
  const pinnedIds = useEditorStore((s) => s.pinnedThumbnailIds)
  const currentId = useEditorStore((s) => s.currentThumbnailId)
  const { busy, run } = useAsyncAction()
  const [choosing, setChoosing] = useState(false)

  const visible = visibleThumbnails(thumbnails, folders, pinnedIds, currentId)

  const exportThumbnails = (targets: Thumbnail[]) =>
    run(t('書き出しに失敗しました'), () => exportPngs(targets)).then(() => setChoosing(false))

  return (
    <>
      <button
        type="button"
        onClick={() => (visible.length > 1 ? setChoosing(true) : void exportThumbnails(visible))}
        disabled={busy || visible.length === 0}
        className={styles.export}
      >
        {busy ? t('書き出し中…') : t('PNG書き出し')}
      </button>
      {choosing && (
        <ExportDialog
          thumbnails={visible}
          busy={busy}
          onExport={(targets) => void exportThumbnails(targets)}
          onClose={() => setChoosing(false)}
        />
      )}
    </>
  )
}
