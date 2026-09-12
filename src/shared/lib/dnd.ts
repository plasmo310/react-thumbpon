/**
 * ドラッグ＆ドロップで受け渡す種別。
 * dragover の時点では getData が読めないため、種別を MIME に持たせて types で判定する。
 */
export const DND_TYPE = {
  asset: 'application/x-thumbpon-asset',
  layer: 'application/x-thumbpon-layer',
  thumbnail: 'application/x-thumbpon-thumbnail',
  /** OSからのファイルドロップ。ブラウザが付ける固定値 */
  files: 'Files',
} as const

export type DndType = (typeof DND_TYPE)[keyof typeof DND_TYPE]

/**
 * ドラッグ中のデータがその種別を含むか調べる。
 *
 * @param dataTransfer ドラッグイベントの dataTransfer
 * @param types        受け入れたい種別。ひとつでも含まれれば true
 */
export function hasDragType(dataTransfer: DataTransfer, ...types: DndType[]): boolean {
  return types.some((type) => dataTransfer.types.includes(type))
}
