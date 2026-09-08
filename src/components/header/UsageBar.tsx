/** 左から順に踏む手順。番号は表示時に振るので、ここには文言だけを置く */
const STEPS = [
  'サムネイルを追加',
  '素材や文字を置く',
  '位置と見た目を整える',
  'PNG書き出し',
]

/**
 * ヘッダー下に常に出す案内帯。
 * 初めて開いた人が、何のツールでどう進めればよいかを画面を離れずに掴めるようにする。
 */
export function UsageBar() {
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line bg-panel px-5 text-[11px] text-ink-sub">
      <span className="shrink-0 font-bold text-ink">
        テンプレートからサムネイルを量産するツール
      </span>
      <span className="min-w-0 truncate">
        画像もフォントもこの端末の中だけで処理され、どこにも送信されません。
      </span>

      <ol className="ml-auto flex shrink-0 items-center gap-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="text-line">›</span>}
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-soft text-[9px] font-bold text-accent">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}
