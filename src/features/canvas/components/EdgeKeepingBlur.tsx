/** 色はそのまま、不透明度を 1 にする。ぼかしで薄まった分を割り戻した色だけを取り出すため */
const OPAQUE = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1'
/**
 * 不透明度を RGB に移し、不透明度は「要素の内側なら 1、外なら 0」にする。不透明度も色と同じ方法で割り戻すため。
 * 内側かどうかは EDGE_KEEPING_BLUR_BASE の下敷きで見分ける（わずかでも不透明なら 255 倍で 1 に張り付く）
 */
const ALPHA_TO_RGB = '0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 255 0'
/** RGB に入れておいた値を不透明度に戻す */
const RGB_TO_ALPHA = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0'

/**
 * フィルタを掛ける要素に敷く、ほぼ透明な下敷き。
 * 縮小表示ではフィルタ領域が要素より 1px ほど外へ広がることがあり、その余白まで「透明な画素」として
 * 数えると縁が薄く透ける。下敷きのある画素だけを要素の内側として数えるために使う。
 */
export const EDGE_KEEPING_BLUR_BASE = 'rgb(0 0 0 / 0.005)'

/**
 * 枠の縁を透けさせないぼかしの SVG フィルタ。filter: url(#id) で参照する。
 *
 * CSS の blur は枠の外を透明として混ぜるので、キャンバスいっぱいの画像の縁が透けて下地が見える。
 * フィルタ領域を要素の矩形ぴったりにし、ぼかした結果を「領域内の重みの合計」で割り戻すことで、
 * 縁でも領域内の画素だけの平均になる（透過 PNG の中の透明部分は、通常のぼかしと同じく透ける）。
 * 要素には EDGE_KEEPING_BLUR_BASE を背景に敷くこと。
 * 割り算は SVG フィルタに無いが、feColorMatrix が乗算済みでない色を受け取る仕様を使うと
 * 「ぼかした色 ÷ ぼかした不透明度」が得られる。不透明度も一度 RGB に移して同じ方法で割り戻す。
 * Chrome は feGaussianBlur の edgeMode を無視するため、端を延ばす方法は使えない。
 *
 * @param props.id   filter: url(#id) で参照する id。ページ内で一意にする
 * @param props.blur ぼかし半径(キャンバス実寸px)。CSS の blur() と同じ量になる
 */
export function EdgeKeepingBlur({ id, blur }: { id: string; blur: number }) {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden', pointerEvents: 'none' }}
    >
      <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation={blur} />
        <feColorMatrix type="matrix" values={OPAQUE} result="color" />
        <feColorMatrix in="SourceGraphic" type="matrix" values={ALPHA_TO_RGB} />
        <feGaussianBlur stdDeviation={blur} />
        <feColorMatrix type="matrix" values={RGB_TO_ALPHA} result="alpha" />
        <feComposite in="color" in2="alpha" operator="in" />
      </filter>
    </svg>
  )
}
