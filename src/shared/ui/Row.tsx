import type { ReactNode } from 'react'

/**
 * プロパティ1行分のレイアウト。ラベル幅を揃えて縦に並べるためのもの。
 *
 * @param props.label    左側に出す項目名
 * @param props.children 右側に置く入力部品
 */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-ink-sub">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}
