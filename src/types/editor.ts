export type CanvasSize = { width: number; height: number }

export type CanvasPreset = { id: string; label: string; width: number; height: number }

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'fhd', label: '1920 × 1080', width: 1920, height: 1080 },
  { id: 'svga', label: '800 × 600', width: 800, height: 600 },
]

export const CUSTOM_PRESET_ID = 'custom'

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
  /** 縁取り。0で無効 */
  strokeWidth: number
  strokeColor: string
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

/** 1枚のサムネイル。キャンバスサイズもサムネイルごとに持つ */
export type Thumbnail = {
  id: string
  name: string
  folderId: string | null
  canvas: CanvasSize
  background: Background
  layers: Layer[]
}

export type Folder = { id: string; name: string; collapsed: boolean }

export type FontSource = 'builtin' | 'local' | 'file'
export type FontEntry = { id: string; family: string; label: string; source: FontSource }

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

export type TextPreset = { id: string; name: string; style: TextStyle }
export type BackgroundPreset = { id: string; name: string; background: Background }

/** 素材は JSON なら dataUrl、ZIP なら zip 内のパス(file)で持つ */
export type ProjectAssetEntry = { meta: AssetMeta; dataUrl?: string; file?: string }

/** プロジェクトファイル(.thumbpon.json / .thumbpon.zip)の中身 */
export type ProjectFile = {
  format: 'thumbpon-project'
  version: 1
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  assets: ProjectAssetEntry[]
  textPresets?: TextPreset[]
  backgroundPresets?: BackgroundPreset[]
}

/** 背景行を選択状態として表すための予約 id */
export const BACKGROUND_ID = '__background__'

export const BUILTIN_FONTS: FontEntry[] = [
  { id: 'noto', family: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP', source: 'builtin' },
  {
    id: 'gothic',
    family: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif',
    label: 'ゴシック体',
    source: 'builtin',
  },
  {
    id: 'mincho',
    family: '"Hiragino Mincho ProN", "Yu Mincho", "MS Mincho", serif',
    label: '明朝体',
    source: 'builtin',
  },
  { id: 'system', family: 'system-ui, sans-serif', label: 'System UI', source: 'builtin' },
  { id: 'mono', family: 'ui-monospace, "Consolas", monospace', label: 'Monospace', source: 'builtin' },
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
