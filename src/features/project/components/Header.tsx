import { ExportButton } from './ExportButton'
import { ProjectMenu } from './ProjectMenu'
import { WorkspaceStatus } from './WorkspaceStatus'
import styles from '../styles.module.css'

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
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        {/*
          文字サイズが違うものを並べるので、ベースラインではなく文字の中心で揃える
          （ベースライン揃えだと下端しか合わず、大きい見出しだけ上に飛び出して見える）。

          そのうえで見出しだけ大きさが違うぶんの差が残るので、TITLE_OFFSET_Y で詰める。
        */}
        <div className={styles.brand}>
          <h1 className={styles.title} style={{ transform: `translateY(${TITLE_OFFSET_Y}px)` }}>
            サムネぽん！
          </h1>
          <span className={styles.sub}>ThumbPon</span>
          <div className={styles.separator} />
          <span className={styles.lead}>テンプレートからサムネイルを量産するツール</span>
        </div>

        <div className={styles.tools}>
          <WorkspaceStatus />
          <ProjectMenu />
          <ExportButton />
        </div>
      </div>

      {/* 操作が1段目に収まったので、2段目は案内だけの細い帯にする */}
      <div className={styles.subBar}>
        <span className={styles.lead}>
          画像もフォントもこの端末の中だけで処理され、どこにも送信されません。
        </span>
      </div>
    </header>
  )
}
