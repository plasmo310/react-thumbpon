import { useCurrentThumbnail } from '@/app/store'
import { useAsyncAction } from '@/shared/lib/useAsyncAction'
import { exportPng } from './exportImage'
import styles from './styles.module.css'

/** 現在のサムネイルを PNG として書き出す。書き出し中は二重押しを防ぐ */
export function ExportButton() {
  const { canvas, name } = useCurrentThumbnail()
  const { busy, run } = useAsyncAction()

  return (
    <button
      type="button"
      onClick={() => void run('書き出しに失敗しました', () => exportPng(canvas, name))}
      disabled={busy}
      className={styles.export}
    >
      {busy ? '書き出し中…' : 'PNG書き出し'}
    </button>
  )
}
