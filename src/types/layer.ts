export type TextAlign = 'left' | 'center' | 'right'

/** 画像・テキストに共通する配置と表示の情報 */
export type LayerBase = {
  id: string
  name: string
  /** キャンバス実寸座標(px)、レイヤー左上基準 */
  x: number
  y: number
  width: number
  /** 度数法 */
  rotation: number
  /** 0..1 */
  opacity: number
  visible: boolean
  locked: boolean
}

export type ImageLayer = LayerBase & {
  type: 'image'
  assetId: string
  height: number
}

/** テキストは height を持たず内容に応じて伸びる */
export type TextLayer = LayerBase & {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: TextAlign
  letterSpacing: number
  lineHeight: number
  color: string
  /** 縁取り。0で無効 */
  strokeWidth: number
  strokeColor: string
}

export type Layer = ImageLayer | TextLayer

/** テキストレイヤーの見た目だけを抜き出したもの。プリセットの中身になる */
export type TextStyle = Pick<
  TextLayer,
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textAlign'
  | 'letterSpacing'
  | 'lineHeight'
  | 'color'
  | 'strokeWidth'
  | 'strokeColor'
>

/** TextStyle のキー一覧。型から実行時の配列は作れないので手で持つ */
export const TEXT_STYLE_KEYS: (keyof TextStyle)[] = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'textAlign',
  'letterSpacing',
  'lineHeight',
  'color',
  'strokeWidth',
  'strokeColor',
]
