/**
 * 見た目の効果。レイヤー（テキスト・画像）と背景で共通に使う。
 * 影も光彩も矩形ではなく中身の形（文字の輪郭・画像の透過・模様の隙間）に沿わせたいので、
 * box-shadow ではなく filter の drop-shadow で描く前提の持ち方にしている。
 */
export type Effects = {
  /** ぼかし半径(px)。0で無効 */
  blur: number
  shadowEnabled: boolean
  /** 影のずらし量(キャンバス実寸px) */
  shadowX: number
  shadowY: number
  /** 影のぼかし半径(px)。0なら同じ形がくっきり出る */
  shadowBlur: number
  shadowColor: string
  /** 影の濃さ(0..1)。色は #RRGGBB なので不透明度は別に持つ */
  shadowOpacity: number
  glowEnabled: boolean
  /** 光彩の広がり(px) */
  glowBlur: number
  glowColor: string
  /** 光彩の濃さ(0..1) */
  glowOpacity: number
}

export const DEFAULT_EFFECTS: Effects = {
  blur: 0,
  shadowEnabled: false,
  shadowX: 6,
  shadowY: 6,
  shadowBlur: 8,
  shadowColor: '#25282D',
  shadowOpacity: 0.4,
  glowEnabled: false,
  glowBlur: 12,
  glowColor: '#FF8A5B',
  glowOpacity: 0.8,
}
