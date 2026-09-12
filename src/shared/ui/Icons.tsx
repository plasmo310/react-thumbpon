/**
 * 一覧の中で使う線画アイコン。
 * アイコン用の依存を増やしたくないので、必要なものだけ SVG で持つ。
 * 色は stroke="currentColor" で親の文字色に追従させる（IconButton の状態色がそのまま乗る）。
 */

/** 全アイコン共通の枠。14px は IconButton(24px) の中で絵文字と同じくらいに見える大きさ */
const VIEW_BOX = '0 0 14 14'
const STROKE_WIDTH = 1.4

/** レイヤーが表示されていることを表す、開いた目 */
export function EyeIcon() {
  return (
    <svg
      viewBox={VIEW_BOX}
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 7c1.6-2.6 3.6-3.9 6-3.9S11.4 4.4 13 7c-1.6 2.6-3.6 3.9-6 3.9S2.6 9.6 1 7Z" />
      <circle cx="7" cy="7" r="1.7" />
    </svg>
  )
}

/** レイヤーが非表示であることを表す、斜線を引いた目 */
export function EyeOffIcon() {
  return (
    <svg
      viewBox={VIEW_BOX}
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.4 4.2C1.8 4.9 1.3 5.9 1 7c1.6 2.6 3.6 3.9 6 3.9 1 0 1.9-.2 2.7-.6" />
      <path d="M12 9.1c.4-.6.7-1.3 1-2.1-1.6-2.6-3.6-3.9-6-3.9-.6 0-1.1.1-1.6.2" />
      <path d="M5.8 5.8a1.7 1.7 0 0 0 2.4 2.4" />
      <path d="M1.8 1.8l10.4 10.4" />
    </svg>
  )
}
