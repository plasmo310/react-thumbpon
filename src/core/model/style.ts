import type { CSSProperties } from 'react'
import {
  DEFAULT_BACKGROUND,
  DEFAULT_EFFECTS,
  type Background,
  type Effects,
  type Layer,
  type TextLayer,
} from './types'

/*
 * ドキュメントの値を CSS へ変換する。描画する側（キャンバス）はこれを呼ぶだけにする。
 * 掛ける先がレイヤーでも背景でも同じものを使うので、エフェクトと背景をここにまとめている。
 */

// ---------------------------------------------------------------------------
// エフェクト（ブラー / シャドウ / 光彩）
// ---------------------------------------------------------------------------

/**
 * #RRGGBB と不透明度から rgba() を作る。
 * カラーピッカーが不透明度を扱えないため、濃さは別フィールドで持って
 * ここで合成している。
 *
 * @param hex   #RRGGBB 形式の色。読めない値はそのまま返す
 * @param alpha 不透明度(0..1)
 */
function rgba(hex: string, alpha: number): string {
  const matched = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!matched) return hex
  const value = parseInt(matched[1], 16)
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  const a = Math.min(1, Math.max(0, alpha))
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** 光彩を drop-shadow 1回で描くと薄すぎて光って見えないので、この回数だけ重ねる */
const GLOW_LAYERS = 3

/**
 * エフェクトを CSS の filter 値に変換する。
 * 影と光彩に drop-shadow を使うのは、要素の矩形ではなく中身の形
 * （文字の輪郭・画像の透過・模様の隙間）に沿った影を出すため。
 *
 * @param effects レイヤーまたは背景のエフェクト。古いプロジェクトには無いので undefined を許す
 * @returns filter に渡す文字列。何も有効でなければ undefined（filter を付けない）
 */
export function effectsFilter(effects: Effects | undefined): string | undefined {
  const e = { ...DEFAULT_EFFECTS, ...effects }
  const parts: string[] = []

  if (e.blur > 0) parts.push(`blur(${e.blur}px)`)
  if (e.shadowEnabled) {
    const blur = Math.max(0, e.shadowBlur)
    parts.push(
      `drop-shadow(${e.shadowX}px ${e.shadowY}px ${blur}px ${rgba(e.shadowColor, e.shadowOpacity)})`,
    )
  }
  if (e.glowEnabled) {
    const glow = `drop-shadow(0 0 ${Math.max(1, e.glowBlur)}px ${rgba(e.glowColor, e.glowOpacity)})`
    for (let i = 0; i < GLOW_LAYERS; i += 1) parts.push(glow)
  }

  return parts.length > 0 ? parts.join(' ') : undefined
}

/**
 * ぼかした層が親の overflow で切り取られて縁が透けないよう、外側にはみ出させる量(px)。
 * blur は半径の 2〜3倍まで滲むので、その分だけ余白を取る。
 *
 * @param effects 対象のエフェクト
 * @returns ぼかしていなければ 0（はみ出させない）
 */
export function effectsBleed(effects: Effects | undefined): number {
  const blur = effects?.blur ?? 0
  return blur > 0 ? Math.ceil(blur * 3) : 0
}

// ---------------------------------------------------------------------------
// 背景（下地色と絵柄の2層）
// ---------------------------------------------------------------------------

/**
 * 模様を CSS のグラデーションに変換する。画像を作らずに済むので書き出しでも劣化しない。
 *
 * @param background 背景設定。pattern 系のフィールドだけを見る
 */
function patternStyle(background: Background): CSSProperties {
  // 1px 未満のマスは模様として意味を成さないので下限を設ける
  const size = Math.max(2, background.patternSize)
  const weight = Math.min(1, Math.max(0, background.patternWeight))
  const color = background.patternColor

  if (background.pattern === 'lines') {
    const thickness = Math.max(1, size * weight)
    return {
      backgroundImage: `repeating-linear-gradient(${background.patternAngle}deg, ${color} 0px, ${color} ${thickness}px, transparent ${thickness}px, transparent ${size}px)`,
    }
  }

  if (background.pattern === 'checker') {
    // 45度のグラデーション2枚を半マスずらして重ねると市松模様になる（CSS の定番手法）
    const square = `linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 75%, ${color} 75%)`
    const half = size / 2
    return {
      backgroundImage: `${square}, ${square}`,
      backgroundSize: `${size}px ${size}px`,
      backgroundPosition: `0 0, ${half}px ${half}px`,
      backgroundRepeat: 'repeat',
    }
  }

  // 水玉。知らない値が来たときの受け皿も兼ねる
  const radius = (size * weight) / 2
  return {
    backgroundImage: `radial-gradient(circle at 50% 50%, ${color} ${radius}px, transparent ${radius}px)`,
    backgroundSize: `${size}px ${size}px`,
    backgroundRepeat: 'repeat',
  }
}

/**
 * 1枚の画像を敷く。cover / contain は1枚だけ、tile は元の比率のまま繰り返す。
 *
 * @param background 背景設定。image 系のフィールドだけを見る
 * @param imageUrl   素材の objectURL
 */
function imageStyle(background: Background, imageUrl: string): CSSProperties {
  if (background.fit === 'tile') {
    return {
      backgroundImage: `url(${imageUrl})`,
      // 高さを auto にすると元の比率のまま並ぶ
      backgroundSize: `${Math.max(2, background.tileWidth)}px auto`,
      backgroundRepeat: 'repeat',
    }
  }
  return {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: background.fit,
    backgroundPosition: background.position,
    backgroundRepeat: 'no-repeat',
  }
}

/**
 * 下地の色。エフェクトを掛けない層に敷く。
 * ぼかしを掛けた層は縁が透けるので、その下に必ず色があるようにするための分離。
 *
 * @param background 現在のサムネイルの背景設定
 */
export function backgroundBaseStyle(background: Background): CSSProperties {
  return { backgroundColor: background.color ?? DEFAULT_BACKGROUND.color }
}

/**
 * 下地色を除いた背景の絵柄（グラデーション・画像・模様）。エフェクトはこちらに掛ける。
 * 単色の背景は絵柄を持たないので空になる（平らな色はぼかしても影を落としても変わらない）。
 * 素材の解決はブラウザ側の関心なので、URL は呼び出し側で引いて渡す。
 *
 * @param background 現在のサムネイルの背景設定。古いプロジェクト由来の欠けは既定値で補う
 * @param imageUrl   背景画像の objectURL。未解決なら null（絵柄なしになる）
 */
export function backgroundArtStyle(background: Background, imageUrl: string | null): CSSProperties {
  const bg = { ...DEFAULT_BACKGROUND, ...background }

  if (bg.type === 'gradient') {
    return {
      backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientFrom}, ${bg.gradientTo})`,
    }
  }

  if (bg.type === 'pattern') return patternStyle(bg)

  if (bg.type === 'image' && imageUrl) return imageStyle(bg, imageUrl)

  return {}
}

// ---------------------------------------------------------------------------
// レイヤー
// ---------------------------------------------------------------------------

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
    height: layer.type === 'image' ? layer.height : undefined,
    opacity: layer.opacity,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: 'center',
    // ブラー・影・光彩。影は矩形ではなく中身の形に沿わせたいので drop-shadow を使う
    filter: effectsFilter(layer.effects),
    pointerEvents: layer.locked ? 'none' : 'auto',
    cursor: layer.locked ? 'default' : 'move',
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
