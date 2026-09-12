/*
 * 編集されるドキュメントの型と定数。アプリ全体の共通言語なので、ここは何も import しない。
 * 並びは依存順（effects → 背景/レイヤー → サムネイル → プリセット → プロジェクト）。
 */

// ---------------------------------------------------------------------------
// エフェクト — レイヤーと背景で共通
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 素材
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// フォント
// ---------------------------------------------------------------------------

export type FontSource = 'builtin' | 'local' | 'file'

/** family は CSS にそのまま渡す値、label は画面に出す名前 */
export type FontEntry = { id: string; family: string; label: string; source: FontSource }

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
  {
    id: 'mono',
    family: 'ui-monospace, "Consolas", monospace',
    label: 'Monospace',
    source: 'builtin',
  },
]

export const FONT_WEIGHTS = [400, 700, 900]

// ---------------------------------------------------------------------------
// 背景
// ---------------------------------------------------------------------------

export type BackgroundType = 'color' | 'gradient' | 'image' | 'pattern'

/** 1枚の画像の敷き方。tile だけ繰り返す */
export type BackgroundFit = 'cover' | 'contain' | 'tile'

/** CSS のグラデーションで描く模様の種類。素材は使わない */
export type PatternType = 'dots' | 'lines' | 'checker'

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
  /** タイルで敷くときの画像1枚の幅(キャンバス実寸px)。高さは元の比率に従う */
  tileWidth: number
  pattern: PatternType
  /** 模様の色。下地は color を使う */
  patternColor: string
  /** 繰り返す1マスの1辺(キャンバス実寸px)。チェックはこの中に4マスが入る */
  patternSize: number
  /** 1マスに対する模様の太さの比(0..1)。水玉の直径・ラインの幅 */
  patternWeight: number
  /** ラインの角度(度数法) */
  patternAngle: number
  /** ぼかし・シャドウ・光彩。下地色を除いた層（画像・グラデ・模様）に掛かる */
  effects: Effects
}

export const DEFAULT_BACKGROUND: Background = {
  type: 'color',
  color: '#FFFFFF',
  gradientFrom: '#FF8A5B',
  gradientTo: '#FFD8C6',
  gradientAngle: 135,
  assetId: null,
  fit: 'cover',
  position: 'center',
  tileWidth: 200,
  pattern: 'dots',
  patternColor: '#FFD8C6',
  patternSize: 64,
  patternWeight: 0.3,
  patternAngle: 45,
  effects: { ...DEFAULT_EFFECTS },
}

/** 背景行を選択状態として表すための予約 id。レイヤーの id と衝突しない値にする */
export const BACKGROUND_ID = '__background__'

// ---------------------------------------------------------------------------
// レイヤー
// ---------------------------------------------------------------------------

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
  effects: Effects
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

// ---------------------------------------------------------------------------
// サムネイルとキャンバス
// ---------------------------------------------------------------------------

export type CanvasSize = { width: number; height: number }

export type CanvasPreset = { id: string; label: string; width: number; height: number }

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'fhd', label: '1920 × 1080', width: 1920, height: 1080 },
  { id: 'svga', label: '800 × 600', width: 800, height: 600 },
]

/** プリセットに当てはまらないサイズを表す、select の value 用の値 */
export const CUSTOM_PRESET_ID = 'custom'

/** 1枚のサムネイル。キャンバスサイズもサムネイルごとに持つ */
export type Thumbnail = {
  id: string
  name: string
  folderId: string | null
  canvas: CanvasSize
  background: Background
  /** index 0 が最背面。zIndex フィールドは持たない */
  layers: Layer[]
}

export type Folder = { id: string; name: string; collapsed: boolean }

// ---------------------------------------------------------------------------
// プリセット
// ---------------------------------------------------------------------------

export type TextPreset = { id: string; name: string; style: TextStyle }
export type BackgroundPreset = { id: string; name: string; background: Background }

// ---------------------------------------------------------------------------
// プロジェクトファイル（project.json）
// ---------------------------------------------------------------------------

/**
 * 素材の格納場所。file はコンテナ内の相対パス（ZIP エントリ名 / フォルダ内のパス）。
 * dataUrl は旧形式(.thumbpon.json)を読むためだけに残しており、書き出しでは使わない。
 */
export type ProjectAssetEntry = { meta: AssetMeta; dataUrl?: string; file?: string }

/**
 * プロジェクトが必要とするフォント。
 * フォントファイルの実体は含めない（同梱すると再配布にあたるため）。
 * 読み込んだ側では、解決できなかったものを名前で知らせるのに使う。
 */
export type ProjectFontRef = {
  /** 画面に出す名前。フォントファイル追加時のファイル名（拡張子なし）と一致する */
  label: string
  /** CSS の font-family にそのまま渡す値 */
  family: string
  /** local は OS のフォント、file は読み込んだフォントファイル */
  source: 'local' | 'file'
}

/**
 * プロジェクトファイル(.thumbpon.zip)とワークスペースフォルダの project.json の中身。
 * version 1 は fonts を、version 2 までは背景の模様設定とレイヤーのエフェクトを持たない。
 * 読み込み側は無い前提で扱うこと（欠けは normalizeThumbnails が既定値で補う）。
 */
export type ProjectFile = {
  format: 'thumbpon-project'
  version: 1 | 2 | 3
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  assets: ProjectAssetEntry[]
  textPresets?: TextPreset[]
  backgroundPresets?: BackgroundPreset[]
  fonts?: ProjectFontRef[]
}
