import { useTranslation } from '@/shared/lib/i18n'
import { addFontFiles, canQueryLocalFonts, queryLocalFonts } from '@/shared/lib/storage/fontRepo'
import type { FontEntry } from '@/domain/font'
import { useEditorStore } from '@/app/store'
import { useAsyncAction } from '@/shared/lib/useAsyncAction'
import { Button, useFilePicker } from '@/shared/ui'
import styles from '../styles.module.css'

const ACCEPT = '.ttf,.otf,.woff,.woff2,font/*'

/**
 * ローカルフォントの読み込み（PCのフォント一覧の取得 / フォントファイルの追加）。
 * 一覧の取得は Chrome 系でしか使えないため、非対応ブラウザではボタン自体を出さない。
 */
export function FontLoader() {
  const t = useTranslation()

  const fonts = useEditorStore((s) => s.fonts)
  const addFonts = useEditorStore((s) => s.addFonts)
  const { busy, run } = useAsyncAction()

  /**
   * 追加結果を知らせて反映する。成功時も何も出ないと、押したのに何も起きていないように見えるため。
   *
   * @param added 新しく追加できたフォント。空なら追加できるものが無かったことを伝える
   */
  const applyAdded = (added: FontEntry[]) => {
    if (added.length === 0) {
      window.alert(t('追加できるフォントがありませんでした'))
      return
    }
    addFonts(added)
    window.alert(t('{0}件のフォントを追加しました', added.length))
  }

  const picker = useFilePicker(
    ACCEPT,
    (files) =>
      void run(t('フォントを読み込めませんでした'), async () =>
        applyAdded(await addFontFiles(Array.from(files))),
      ),
    true,
  )

  return (
    <div className={styles.fontButtons}>
      {canQueryLocalFonts() && (
        <Button
          grow
          disabled={busy}
          onClick={() =>
            void run(t('ローカルフォントを読み込めませんでした'), async () => {
              // 一覧は毎回全件返るため、読み込み済みを除いたものを「追加された分」として数える
              const known = new Set(fonts.map((f) => f.family))
              applyAdded((await queryLocalFonts()).filter((f) => !known.has(f.family)))
            })
          }
        >
          {t('PCのフォントを読み込む')}
        </Button>
      )}
      <Button grow disabled={busy} onClick={picker.open}>
        {t('フォントファイル追加')}
      </Button>
      {picker.element}
    </div>
  )
}
