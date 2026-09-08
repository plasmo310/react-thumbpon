import { CanvasSizeSelect } from './CanvasSizeSelect'
import { ExportButton } from './ExportButton'
import { ProjectFileButtons } from './ProjectFileButtons'

/** 画面上部のツールバー。中身の状態は各ボタン側に閉じているので、ここは並べるだけ */
export default function Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-5">
      <div className="flex items-baseline gap-2">
        <h1 className="text-base font-bold tracking-wide">サムネぽん！</h1>
        <span className="text-[11px] text-ink-sub">ThumbPon</span>
      </div>

      <div className="flex items-center gap-2">
        <CanvasSizeSelect />
        <div className="mx-1 h-5 w-px bg-line" />
        <ProjectFileButtons />
        <ExportButton />
      </div>
    </header>
  )
}
