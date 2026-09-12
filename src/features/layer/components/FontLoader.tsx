import { addFontFiles, canQueryLocalFonts, queryLocalFonts } from '@/shared/lib/storage/fontRepo'
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
  const addFonts = useEditorStore((s) => s.addFonts)
  const { busy, run } = useAsyncAction()

  const picker = useFilePicker(
    ACCEPT,
    (files) =>
      void run('フォントを読み込めませんでした', async () => {
        const added = await addFontFiles(Array.from(files))
        if (added.length === 0) window.alert('追加できるフォントがありませんでした')
        else addFonts(added)
      }),
    true,
  )

  return (
    <div className={styles.fontButtons}>
      {canQueryLocalFonts() && (
        <Button
          grow
          disabled={busy}
          onClick={() =>
            void run('ローカルフォントを読み込めませんでした', async () =>
              addFonts(await queryLocalFonts()),
            )
          }
        >
          PCのフォントを読み込む
        </Button>
      )}
      <Button grow disabled={busy} onClick={picker.open}>
        フォントファイル追加
      </Button>
      {picker.element}
    </div>
  )
}
