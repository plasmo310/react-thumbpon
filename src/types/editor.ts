export type CanvasSize = { width: number; height: number }

export type CanvasPreset = { id: string; label: string; width: number; height: number }

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'fhd', label: '1920 × 1080', width: 1920, height: 1080 },
  { id: 'svga', label: '800 × 600', width: 800, height: 600 },
]

export type TextAlign = 'left' | 'center' | 'right'

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
}

export type Layer = ImageLayer | TextLayer

export type BackgroundType = 'color' | 'gradient' | 'image'
export type BackgroundFit = 'cover' | 'contain'

/** type を切り替えても設定が消えないよう全フィールドを保持する */
export type Background = {
  type: BackgroundType
  color: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  assetId: string | null
  fit: BackgroundFit
  position: string
}

export type AssetMeta = {
  id: string
  name: string
  mime: string
  width: number
  height: number
  createdAt: number
}

/** 背景行を選択状態として表すための予約 id */
export const BACKGROUND_ID = '__background__'

export type FontOption = { label: string; value: string }

export const FONT_OPTIONS: FontOption[] = [
  { label: 'Noto Sans JP', value: '"Noto Sans JP", sans-serif' },
  { label: 'ゴシック体', value: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif' },
  { label: '明朝体', value: '"Hiragino Mincho ProN", "Yu Mincho", "MS Mincho", serif' },
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, "Consolas", monospace' },
]

export const FONT_WEIGHTS = [400, 700, 900]

export const DEFAULT_BACKGROUND: Background = {
  type: 'color',
  color: '#FFFFFF',
  gradientFrom: '#FF8A5B',
  gradientTo: '#FFD8C6',
  gradientAngle: 135,
  assetId: null,
  fit: 'cover',
  position: 'center',
}
