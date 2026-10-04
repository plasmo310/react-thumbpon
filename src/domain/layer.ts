import type { CSSProperties } from 'react'
import { DEFAULT_CROP, type Crop } from './crop'
import { DEFAULT_EFFECTS, effectsFilter, type Effects } from './effects'
import { createId } from './id'
import { BUILTIN_FONTS } from './font'
import type { CanvasSize } from './thumbnail'
import type { InlineStyleRange } from './text'

export type TextAlign = 'left' | 'center' | 'right'
export type ShapeKind = 'rectangle' | 'ellipse'
export type ShapeFillType = 'color' | 'gradient' | 'pattern'
export type ShapePattern = 'dots' | 'lines' | 'checker'

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

/** 旧データと新規画像はマスクなし。オンにすると黒の半透明マスクになる。 */
export const DEFAULT_IMAGE_OVERLAY = {
  overlayEnabled: false,
  overlayColor: '#000000',
  /** 0..1。画像全体の不透明度とは独立して保持する */
  overlayOpacity: 0.5,
}

export type ImageLayer = LayerBase &
  typeof DEFAULT_IMAGE_OVERLAY & {
    type: 'image'
    assetId: string
    height: number
    /** 表示する範囲。素材のどこを切り落とすかを割合で持つ */
    crop: Crop
    /** 左右反転。枠は動かさず中身だけを鏡像にする */
    flipX: boolean
  }

/** テキスト背景の既定値。余白と角丸はキャンバス実寸px。 */
export const DEFAULT_TEXT_BACKGROUND = {
  backgroundEnabled: false,
  backgroundColor: '#FFFFFF',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  backgroundRadius: 0,
  backgroundRadiusMode: 'uniform' as 'uniform' | 'individual',
  backgroundRadiusTopLeft: 0,
  backgroundRadiusTopRight: 0,
  backgroundRadiusBottomLeft: 0,
  backgroundRadiusBottomRight: 0,
}

/**
 * 旧データの均一な角丸を四隅の初期値として引き継ぐ。
 * @param background 保存済みの背景設定。後から増えた項目は省略可能
 */
export function normalizeTextBackground(
  background: Partial<typeof DEFAULT_TEXT_BACKGROUND>,
): typeof DEFAULT_TEXT_BACKGROUND {
  const result = { ...DEFAULT_TEXT_BACKGROUND }
  for (const key of Object.keys(result) as (keyof typeof result)[]) {
    if (background[key] !== undefined) Object.assign(result, { [key]: background[key] })
  }
  const radius = background.backgroundRadius ?? 0
  result.backgroundRadiusTopLeft = background.backgroundRadiusTopLeft ?? radius
  result.backgroundRadiusTopRight = background.backgroundRadiusTopRight ?? radius
  result.backgroundRadiusBottomLeft = background.backgroundRadiusBottomLeft ?? radius
  result.backgroundRadiusBottomRight = background.backgroundRadiusBottomRight ?? radius
  return result
}

/** 外側の縁は縁1の外周から広げるオフセット(px)を保持する。 */
export const DEFAULT_OUTER_STROKE = { outerStrokeWidth: 0, outerStrokeColor: '#FFFFFF' }

/**
 * 旧レイヤーとプリセットでは外側の縁を無効にする。
 * @param style 保存済みの外側の縁設定
 */
export function normalizeOuterStroke(style: Partial<typeof DEFAULT_OUTER_STROKE>) {
  return {
    outerStrokeWidth: style.outerStrokeWidth ?? DEFAULT_OUTER_STROKE.outerStrokeWidth,
    outerStrokeColor: style.outerStrokeColor ?? DEFAULT_OUTER_STROKE.outerStrokeColor,
  }
}

/** テキストは height を持たず内容に応じて伸びる */
export type TextLayer = LayerBase &
  typeof DEFAULT_TEXT_BACKGROUND &
  typeof DEFAULT_OUTER_STROKE & {
    type: 'text'
    autoFit: boolean
    text: string
    /** 文字範囲ごとの上書き。旧データでは省略される。 */
    inlineStyles?: InlineStyleRange[]
    fontFamily: string
    fontSize: number
    fontWeight: number
    fontStyle: 'normal' | 'italic'
    textAlign: TextAlign
    letterSpacing: number
    lineHeight: number
    /** 固定の行高(px)。null は文字サイズに応じた従来の行間 */
    fixedLineHeight: number | null
    color: string
    /** 縁取り。0で無効 */
    strokeWidth: number
    strokeColor: string
  }

/** 配置できる図形。ellipse は通常のリサイズで楕円にもなる「円」の実体。 */
export type ShapeLayer = LayerBase & {
  type: 'shape'
  height: number
  shape: ShapeKind
  /** 四角形の均一な角丸半径。ellipse では使わないが、形状を戻したときのため保持する */
  cornerRadius: number
  fillType: ShapeFillType
  color: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  pattern: ShapePattern
  patternColor: string
  patternSize: number
  patternWeight: number
  patternAngle: number
}

export type Layer = ImageLayer | TextLayer | ShapeLayer

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
  | 'fixedLineHeight'
  | 'color'
  | 'strokeWidth'
  | 'strokeColor'
  | 'outerStrokeWidth'
  | 'outerStrokeColor'
  | keyof typeof DEFAULT_TEXT_BACKGROUND
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
  'fixedLineHeight',
  'color',
  'strokeWidth',
  'strokeColor',
  'outerStrokeWidth',
  'outerStrokeColor',
  ...(Object.keys(DEFAULT_TEXT_BACKGROUND) as (keyof typeof DEFAULT_TEXT_BACKGROUND)[]),
]

/**
 * レイヤー共通部分の初期値。位置とサイズは呼び出し側で上書きする前提。
 *
 * @param name レイヤーパネルに出す名前
 */
function createLayerBase(name: string): LayerBase {
  return {
    id: createId(),
    name,
    x: 0,
    y: 0,
    width: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    effects: { ...DEFAULT_EFFECTS },
  }
}

/**
 * 素材をキャンバス中央に置く画像レイヤーを作る。
 *
 * @param name   レイヤー名。素材のファイル名をそのまま使う
 * @param assetId 参照する素材の id。画像の実体は IndexedDB 側にある
 * @param rect   キャンバス実寸での配置。左上基準
 */
export function createImageLayer(
  name: string,
  assetId: string,
  rect: { x: number; y: number; width: number; height: number },
): ImageLayer {
  return {
    ...createLayerBase(name),
    type: 'image',
    assetId,
    crop: { ...DEFAULT_CROP },
    flipX: false,
    ...DEFAULT_IMAGE_OVERLAY,
    ...rect,
  }
}

/**
 * テキストレイヤーを作る。height は持たず内容に応じて伸びる。
 *
 * @param canvas キャンバス実寸。幅と文字サイズをこれに対する比率で決める
 */
export function createTextLayer(canvas: CanvasSize): TextLayer {
  const width = Math.round(canvas.width * 0.6)
  const fontSize = Math.round(canvas.height * 0.09)
  return {
    ...createLayerBase('テキスト'),
    type: 'text',
    autoFit: true,
    ...DEFAULT_TEXT_BACKGROUND,
    ...DEFAULT_OUTER_STROKE,
    text: 'テキストを入力',
    width,
    x: Math.round((canvas.width - width) / 2),
    y: Math.round(canvas.height / 2 - fontSize),
    fontFamily: BUILTIN_FONTS[0].family,
    fontSize,
    fontWeight: 900,
    fontStyle: 'normal',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 1.3,
    fixedLineHeight: null,
    color: '#25282D',
    strokeWidth: 0,
    strokeColor: '#FFFFFF',
  }
}

/**
 * 図形レイヤーをキャンバス中央に追加する。
 *
 * @param canvas キャンバス実寸。初期サイズを決める
 * @param shape  追加する形状
 */
export function createShapeLayer(canvas: CanvasSize, shape: ShapeKind): ShapeLayer {
  const size = Math.round(Math.min(canvas.width, canvas.height) * 0.4)
  const width = shape === 'rectangle' ? Math.round(canvas.width * 0.5) : size
  const height = shape === 'rectangle' ? Math.round(canvas.height * 0.3) : size
  return {
    ...createLayerBase(shape === 'rectangle' ? '四角形' : '円'),
    type: 'shape',
    shape,
    width,
    height,
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    cornerRadius: 0,
    fillType: 'color',
    color: '#FF8A5B',
    gradientFrom: '#FF8A5B',
    gradientTo: '#FFD8C6',
    gradientAngle: 135,
    pattern: 'dots',
    patternColor: '#FFD8C6',
    patternSize: 64,
    patternWeight: 0.3,
    patternAngle: 45,
  }
}

/**
 * レイヤーを、入れ子のフィールドまで作り直して複製する。
 * 位置も名前もそのままなので、サムネイルごと複製するときに使う。
 *
 * @param source 複製元のレイヤー。effects / crop は共有せず作り直す
 */
export function copyLayer(source: Layer): Layer {
  const copy = { ...source, id: createId(), effects: { ...source.effects } }
  if (copy.type === 'text')
    return {
      ...copy,
      inlineStyles: copy.inlineStyles?.map((range) => ({ ...range, style: { ...range.style } })),
    }
  return copy.type === 'image' ? { ...copy, crop: { ...copy.crop } } : copy
}

/**
 * レイヤーを複製する。重なって見えないよう少しずらす。
 *
 * @param source 複製元のレイヤー
 */
export function cloneLayer(source: Layer): Layer {
  return {
    ...copyLayer(source),
    name: `${source.name} のコピー`,
    x: source.x + 24,
    y: source.y + 24,
  }
}

/**
 * テキストレイヤーから見た目だけを取り出す。プリセットの中身になる。
 *
 * @param layer 抽出元のテキストレイヤー
 */
export function extractTextStyle(layer: TextLayer): TextStyle {
  const style = {} as TextStyle
  for (const key of TEXT_STYLE_KEYS) {
    Object.assign(style, { [key]: layer[key] })
  }
  return style
}

/**
 * レイヤーの配置とエフェクト。座標もサイズも実寸で書き、表示の縮小は親が行う。
 *
 * @param layer 対象のレイヤー
 */
export function layerStyle(layer: Layer): CSSProperties {
  return {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.width,
    height: layer.type === 'text' ? undefined : layer.height,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: 'center',
    // ブラー・影・光彩。影は矩形ではなく中身の形に沿わせたいので drop-shadow を使う
    filter: effectsFilter(layer.effects),
    pointerEvents: layer.locked ? 'none' : 'auto',
    cursor: layer.locked ? 'default' : 'move',
  }
}

/** 図形の塗りを CSS 背景に変換する。 */
export function shapeFillStyle(layer: ShapeLayer): CSSProperties {
  if (layer.fillType === 'color') return { backgroundColor: layer.color }
  if (layer.fillType === 'gradient') {
    return {
      backgroundImage: `linear-gradient(${layer.gradientAngle}deg, ${layer.gradientFrom}, ${layer.gradientTo})`,
    }
  }
  const size = Math.max(2, layer.patternSize)
  const weight = Math.min(1, Math.max(0, layer.patternWeight))
  if (layer.pattern === 'lines') {
    const thickness = Math.max(1, size * weight)
    return {
      backgroundColor: layer.color,
      backgroundImage: `repeating-linear-gradient(${layer.patternAngle}deg, ${layer.patternColor} 0px, ${layer.patternColor} ${thickness}px, transparent ${thickness}px, transparent ${size}px)`,
    }
  }
  if (layer.pattern === 'checker') {
    const square = `linear-gradient(45deg, ${layer.patternColor} 25%, transparent 25%, transparent 75%, ${layer.patternColor} 75%)`
    return {
      backgroundColor: layer.color,
      backgroundImage: `${square}, ${square}`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `0 0, ${size / 2}px ${size / 2}px`,
    }
  }
  const radius = (size * weight) / 2
  return {
    backgroundColor: layer.color,
    backgroundImage: `radial-gradient(circle at 50% 50%, ${layer.patternColor} ${radius}px, transparent ${radius}px)`,
    backgroundSize: `${size}px ${size}px`,
  }
}

/** 図形の輪郭。角丸は四角形だけに掛ける。 */
export function shapeFrameStyle(layer: ShapeLayer): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius:
      layer.shape === 'ellipse'
        ? '50%'
        : `${Math.min(layer.cornerRadius, layer.width / 2, layer.height / 2)}px`,
  }
}

/**
 * 画像レイヤーの中身を入れる層。レイヤーの枠いっぱいに広げ、左右反転をここで掛ける。
 * レイヤー自体に反転を掛けないのは、影や光彩の向きまで一緒に反転してしまうため
 * （エフェクトは枠の側に掛かっている）。
 *
 * @param layer 対象の画像レイヤー
 */
export function imageFrameStyle(layer: ImageLayer): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    transform: layer.flipX ? 'scaleX(-1)' : undefined,
  }
}

/**
 * クロップ後の画像枠を覆うマスク。操作は背面の画像レイヤーに渡す。
 * @param layer マスクの色と不透明度を持つ画像レイヤー
 */
export function imageOverlayStyle(layer: ImageLayer): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    backgroundColor: layer.overlayColor,
    opacity: layer.overlayOpacity,
    pointerEvents: 'none',
  }
}

/**
 * テキストレイヤーの文字まわり。高さは持たず内容に応じて伸びる。
 *
 * @param layer 対象のテキストレイヤー
 */
export function textStyle(layer: TextLayer): CSSProperties {
  return {
    color: layer.color,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    textAlign: layer.textAlign,
    letterSpacing: `${layer.letterSpacing}px`,
    lineHeight: layer.fixedLineHeight == null ? layer.lineHeight : `${layer.fixedLineHeight}px`,
    whiteSpace: layer.autoFit ? 'pre' : 'pre-wrap',
    wordBreak: layer.autoFit ? 'normal' : 'break-word',
    // 縁取り。paint-order で文字の外側に描かせる
    WebkitTextStrokeWidth: layer.strokeWidth > 0 ? `${layer.strokeWidth}px` : undefined,
    WebkitTextStrokeColor: layer.strokeColor,
    paintOrder: 'stroke fill',
  }
}

/**
 * 背景と余白をテキスト外枠へ適用する。
 * @param layer 対象のテキストレイヤー
 */
export function textFrameStyle(layer: TextLayer): CSSProperties {
  return {
    boxSizing: 'border-box',
    minWidth: layer.backgroundEnabled ? layer.paddingLeft + layer.paddingRight + 1 : 1,
    backgroundColor: layer.backgroundEnabled ? layer.backgroundColor : undefined,
    padding: layer.backgroundEnabled
      ? `${layer.paddingTop}px ${layer.paddingRight}px ${layer.paddingBottom}px ${layer.paddingLeft}px`
      : undefined,
    borderRadius: layer.backgroundEnabled
      ? layer.backgroundRadiusMode === 'individual'
        ? `${layer.backgroundRadiusTopLeft}px ${layer.backgroundRadiusTopRight}px ${layer.backgroundRadiusBottomRight}px ${layer.backgroundRadiusBottomLeft}px`
        : layer.backgroundRadius
      : undefined,
  }
}
