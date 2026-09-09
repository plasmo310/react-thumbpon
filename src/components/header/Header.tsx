import { ExportButton } from './ExportButton'
import { NewProjectButton } from './NewProjectButton'
import { ProjectFileButtons } from './ProjectFileButtons'
import { WorkspaceButtons } from './WorkspaceButtons'
import { WorkspaceStatus } from './WorkspaceStatus'

/**
 * 画面上部のツールバー。中身の状態は各ボタン側に閉じているので、ここは並べるだけ。
 * 操作を1列に並べると右上に固まって読み取れないので、
 * 1段目＝何のツールで今どこに保存しているか、2段目＝ファイル操作、と役割で段を分ける。
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
          <ExportButton />
        </div>
      </div>

      <div className="flex h-10 items-center gap-2 border-b border-line bg-panel px-5">
        <span className="min-w-0 truncate text-[11px] text-ink-sub">
          画像もフォントもこの端末の中だけで処理され、どこにも送信されません。
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-4">
          <NewProjectButton />
          <WorkspaceButtons />
          <div className="mx-1 h-5 w-px bg-line" />
          <ProjectFileButtons />
        </div>
      </div>
    </header>
  )
}
