/** ヘッダーに並ぶ枠線ボタンの共通クラス */
export const toolbarButton =
  'rounded-md border border-line px-3 py-1.5 text-xs text-ink-sub transition hover:border-accent hover:text-accent'

/**
 * ヘッダーに並ぶ select の共通クラス。
 * 左右の余白だけは使う場所で違うので、あえて含めず利用側で足す
 * （Tailwind は同種のユーティリティを重ねると後勝ちになり、意図した方が効かなくなるため）。
 */
export const toolbarSelect =
  'cursor-pointer rounded-md border border-line bg-white py-1.5 text-xs outline-none focus:border-accent'
