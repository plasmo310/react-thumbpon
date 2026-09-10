import {
  BUILTIN_FONTS,
  CANVAS_PRESETS,
  DEFAULT_BACKGROUND,
  DEFAULT_EFFECTS,
  TEXT_STYLE_KEYS,
  type CanvasSize,
  type ImageLayer,
  type Layer,
  type LayerBase,
  type TextLayer,
  type TextStyle,
  type Thumbnail,
} from '../../types'

/** 新規サムネイルの既定サイズ。プリセットの先頭を正とする */
export const DEFAULT_CANVAS: CanvasSize = {
  width: CANVAS_PRESETS[0].width,
  height: CANVAS_PRESETS[0].height,
}

/** crypto.randomUUID が無い環境でも衝突しない程度の id を返す */
export const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * 空のサムネイルを作る。
 *
 * @param name     一覧に表示する名前
 * @param folderId 所属フォルダ。null は未分類
 * @param canvas   キャンバス実寸。サムネイルごとに持つので呼び出し側の現在値を渡す
 */
export function createThumbnail(
  name: string,
  folderId: string | null = null,
  canvas: CanvasSize = DEFAULT_CANVAS,
): Thumbnail {
  return {
    id: createId(),
    name,
    folderId,
    canvas: { ...canvas },
    background: { ...DEFAULT_BACKGROUND },
    layers: [],
  }
}

/**
 * サムネイルを複製する。レイヤーの id も振り直すので、複製元とは独立して編集できる。
 *
 * @param source 複製元。folderId は引き継ぐため、貼り付け先を変えるときは呼び出し側で上書きする
 * @param name   複製後の名前
 */
export function cloneThumbnail(source: Thumbnail, name: string): Thumbnail {
  return {
    ...source,
    id: createId(),
    name,
    canvas: { ...source.canvas },
    background: { ...source.background },
    layers: source.layers.map((l) => ({ ...l, id: createId(), effects: { ...l.effects } })),
  }
}

/**
 * レイヤー共通部分の初期値。位置とサイズは呼び出し側で上書きする前提。
 *
 * @param name レイヤーパネルに出す名前
 */
export function createLayerBase(name: string): LayerBase {
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
  return { ...createLayerBase(name), type: 'image', assetId, ...rect }
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
 * レイヤーを複製する。重なって見えないよう少しずらす。
 *
 * @param source 複製元のレイヤー
 */
export function cloneLayer(source: Layer): Layer {
  return {
    ...source,
    id: createId(),
    effects: { ...source.effects },
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
