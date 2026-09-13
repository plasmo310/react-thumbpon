import type { CSSProperties } from 'react'
import { DEFAULT_CROP, type Crop } from './crop'
import { DEFAULT_EFFECTS, effectsFilter, type Effects } from './effects'
import { createId } from './id'
import { BUILTIN_FONTS } from './font'
import type { CanvasSize } from './thumbnail'

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

export type ImageLayer = LayerBase & {
  type: 'image'
  assetId: string
  height: number
  /** 表示する範囲。素材のどこを切り落とすかを割合で持つ */
  crop: Crop
  /** 左右反転。枠は動かさず中身だけを鏡像にする */
  flipX: boolean
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
    lineHeight: layer.lineHeight,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    // 縁取り。paint-order で文字の外側に描かせる
    WebkitTextStrokeWidth: layer.strokeWidth > 0 ? `${layer.strokeWidth}px` : undefined,
    WebkitTextStrokeColor: layer.strokeColor,
    paintOrder: 'stroke fill',
  }
}
