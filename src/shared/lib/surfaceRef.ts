const surfaces = new Map<string, HTMLElement>()

/**
 * PNG書き出しの対象になるキャンバス要素を覚えておく。
 *
 * 描く側（canvas）と書き出す側（project）は別の feature なので、直接呼び合わせずに
 * ここを経由させている。ref を props で引き回さずに済ませる目的も兼ねる。
 *
 * @param thumbnailId 描画するサムネイルのID
 * @param element キャンバスの実寸要素。アンマウント時は null を渡す
 */
export function setSurface(thumbnailId: string, element: HTMLElement | null) {
  if (element) surfaces.set(thumbnailId, element)
  else surfaces.delete(thumbnailId)
}

/**
 * @param thumbnailId 書き出し対象のサムネイルのID
 * @returns 描画済みの実寸要素。未描画ならnull
 */
export function getSurface(thumbnailId: string): HTMLElement | null {
  return surfaces.get(thumbnailId) ?? null
}
