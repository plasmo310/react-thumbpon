let surface: HTMLElement | null = null

/**
 * PNG書き出しの対象になるキャンバス要素を覚えておく。
 *
 * 描く側（canvas）と書き出す側（project）は別の feature なので、直接呼び合わせずに
 * ここを経由させている。ref を props で引き回さずに済ませる目的も兼ねる。
 *
 * @param element キャンバスの実寸要素。アンマウント時は null を渡す
 */
export function setSurface(element: HTMLElement | null) {
  surface = element
}

/** 覚えてある要素。まだ描かれていなければ null */
export function getSurface(): HTMLElement | null {
  return surface
}
