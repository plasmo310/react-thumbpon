/**
 * 素材画像のメタ情報。画像の実体は IndexedDB に、objectURL は assetRepo の Map にある。
 * ストアへはこのメタだけを載せる（状態を JSON 化可能に保つため）。
 */
export type AssetMeta = {
  id: string
  name: string
  mime: string
  width: number
  height: number
  createdAt: number
}
