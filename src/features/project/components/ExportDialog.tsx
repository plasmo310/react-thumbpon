import { useEffect, useState } from 'react'
import { useTranslation } from '@/shared/lib/i18n'
import type { Thumbnail } from '@/domain/thumbnail'
import { Button } from '@/shared/ui'
import styles from '../styles.module.css'

/**
 * 書き出すサムネイルを1枚ずつ選ぶダイアログ。全部チェックなら一括、1枚だけなら個別になる。
 * 一括と個別を別の操作に分けないのは、途中の組み合わせ（3枚のうち2枚）も同じ画面で選べるようにするため。
 *
 * @param props.thumbnails 候補。Canvas に表示中のサムネイル
 * @param props.busy       書き出し中。二重実行を防ぐ
 * @param props.onExport   チェックしたサムネイルで書き出す
 * @param props.onClose    取り消して閉じる
 */
export function ExportDialog({
  thumbnails,
  busy,
  onExport,
  onClose,
}: {
  thumbnails: Thumbnail[]
  busy: boolean
  onExport: (selected: Thumbnail[]) => void
  onClose: () => void
}) {
  const t = useTranslation()
  const [checked, setChecked] = useState(() => new Set(thumbnails.map((item) => item.id)))

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const selected = thumbnails.filter((item) => checked.has(item.id))
  const toggle = (id: string) =>
    setChecked((previous) => {
      const next = new Set(previous)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className={styles.dialogBackdrop} onPointerDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('PNG書き出し')}
        className={styles.dialog}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.dialogTitle}>{t('書き出すサムネイルを選ぶ')}</h2>
        <ul className={styles.dialogList}>
          {thumbnails.map((item) => (
            <li key={item.id}>
              <label className={styles.dialogItem}>
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span className={styles.dialogName}>{item.name}</span>
                <span className={styles.dialogSize}>
                  {item.canvas.width} × {item.canvas.height}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className={styles.dialogActions}>
          <Button onClick={() => setChecked(new Set(thumbnails.map((item) => item.id)))}>
            {t('すべて選ぶ')}
          </Button>
          <Button onClick={() => setChecked(new Set())}>{t('すべて外す')}</Button>
          <span className={styles.dialogSpacer} />
          <Button onClick={onClose}>{t('キャンセル')}</Button>
          <button
            type="button"
            className={styles.export}
            disabled={busy || selected.length === 0}
            onClick={() => onExport(selected)}
          >
            {t('{0}枚を書き出す', selected.length)}
          </button>
        </div>
      </div>
    </div>
  )
}
