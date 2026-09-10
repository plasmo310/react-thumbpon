import { ExportButton } from './ExportButton'
import { ProjectMenu } from './ProjectMenu'
import { WorkspaceStatus } from './WorkspaceStatus'

/**
 * 画面上部のツールバー。中身の状態は各ボタン側に閉じているので、ここは並べるだけ。
 * ファイル操作は「プロジェクト」メニューに畳んであるので、
 * 常用する PNG書き出しだけが一番右に出る。
 */
export default function Header() {
  return (
    <header className="shrink-0">
      <div className="flex h-12 items-center gap-3 border-b border-line bg-panel px-5">
        <h1 className="shrink-0 text-base font-bold tracking-wide">サムネぽん！</h1>
        <span className="shrink-0 text-[11px] text-ink-sub">ThumbPon</span>
        <div className="h-4 w-px shrink-0 bg-line" />
        <span className="min-w-0 truncate text-[11px] text-ink-sub">
          テンプレートからサムネイルを量産するツール
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <WorkspaceStatus />
          <ProjectMenu />
          <ExportButton />
        </div>
      </div>

      {/* 操作が1段目に収まったので、2段目は案内だけの細い帯にする */}
      <div className="flex h-8 items-center border-b border-line bg-panel px-5">
        <span className="min-w-0 truncate text-[11px] text-ink-sub">
          画像もフォントもこの端末の中だけで処理され、どこにも送信されません。
        </span>
      </div>
    </header>
  )
}
