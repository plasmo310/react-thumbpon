import { useTranslation } from '@/shared/lib/i18n'
import { useEditorStore } from '@/app/store'
import { useAsyncAction } from '@/shared/lib/useAsyncAction'
import { IconButton, RefreshIcon } from '@/shared/ui'
import { ExportButton } from './ExportButton'
import { ProjectMenu } from './ProjectMenu'
import { WorkspaceStatus } from './WorkspaceStatus'
import { reloadProjectFolder } from '../lib/projectFolder'
import styles from '../styles.module.css'
import logoUrl from '../../../../resources/images/logo/logo.png'

/**
 * 見出し「サムネぽん！」だけの縦位置の微調整(px)。マイナスで上、プラスで下。小数も可。
 * 0 にすると隣の小さい文字と同じ揃え方（文字の中心ぞろえ）そのままになる。
 *
 * 隣より 5px 大きい文字なので、同じ揃え方でも ascent と descent の非対称さの分
 * （Noto Sans JP は ascent の方が 0.87em 大きい）だけ差が出る。目で見て詰めるための値。
 */
const TITLE_OFFSET_Y = -1

/**
 * 画面上部のツールバー。中身の状態は各ボタン側に閉じているので、ここは並べるだけ。
 * ファイル操作は「プロジェクト」メニューに畳んであるので、
 * 常用する PNG書き出しだけが一番右に出る。
 */
export function Header() {
  const t = useTranslation()
  const locale = useEditorStore((s) => s.locale)
  const setLocale = useEditorStore((s) => s.setLocale)

  const canUndo = useEditorStore((s) => s.historyPast.length > 0)
  const canRedo = useEditorStore((s) => s.historyFuture.length > 0)
  const workspaceStatus = useEditorStore((s) => s.workspaceStatus)
  const workspaceDirty = useEditorStore((s) => s.workspaceDirty)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const { busy, run } = useAsyncAction()

  /** 未保存の編集を確認してから、ワークスペースフォルダの内容で現在の表示を置き換える */
  const handleReload = () => {
    if (
      workspaceDirty &&
      !window.confirm(
        t('未保存の変更を破棄して、プロジェクトを読み込みなおします。よろしいですか？'),
      )
    ) {
      return
    }
    void run(t('プロジェクトを読み込みなおせませんでした'), reloadProjectFolder)
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {/*
          文字サイズが違うものを並べるので、ベースラインではなく文字の中心で揃える
          （ベースライン揃えだと下端しか合わず、大きい見出しだけ上に飛び出して見える）。

          そのうえで見出しだけ大きさが違うぶんの差が残るので、TITLE_OFFSET_Y で詰める。
        */}
        <div className={styles.brand}>
          <img className={styles.logo} src={logoUrl} alt="" />
          <h1 className={styles.title} style={{ transform: `translateY(${TITLE_OFFSET_Y}px)` }}>
            {t('サムネぽん！')}
          </h1>
          <span className={styles.sub}>ThumbPon v{__APP_VERSION__}</span>
          <div className={styles.separator} />
          <span className={styles.lead}>{t('サムネイルをサクッと作るツール')}</span>
        </div>

        <div className={styles.tools}>
          <label className={styles.language}>
            <span>{t('言語')}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'ja')}
            >
              <option value="ja" lang="ja">
                日本語
              </option>
              <option value="en" lang="en">
                English
              </option>
            </select>
          </label>
          <IconButton title={t('元に戻す (Ctrl+Z)')} onClick={undo} disabled={!canUndo}>
            ↶
          </IconButton>
          <IconButton title={t('やり直す (Ctrl+Shift+Z)')} onClick={redo} disabled={!canRedo}>
            ↷
          </IconButton>
          <IconButton
            title={t('プロジェクトデータを読み込みなおす')}
            onClick={handleReload}
            disabled={workspaceStatus !== 'connected' || busy}
          >
            <RefreshIcon />
          </IconButton>
          <WorkspaceStatus />
          <ProjectMenu />
          <ExportButton />
        </div>
      </div>

      {/* 操作が1段目に収まったので、2段目は案内だけの細い帯にする */}
      <div className={styles.subBar}>
        <span className={styles.lead}>
          {t(
            '素材を配置した後、「PNG書き出し」ボタンから画像を書き出せます。画像やフォントはブラウザ内だけで処理され、どこにも送信されません。',
          )}
        </span>
      </div>
    </header>
  )
}
