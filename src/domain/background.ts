import type { CSSProperties } from 'react'
import { DEFAULT_EFFECTS, type Effects } from './effects'

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
    // 象限ごとに塗り分けることで、市松模様の境界を水平・垂直に保つ。
    const square = `conic-gradient(${color} 25%, transparent 25% 50%, ${color} 50% 75%, transparent 75%)`
    return {
      backgroundImage: square,
      backgroundSize: `${size}px ${size}px`,
      backgroundRepeat: 'repeat',
    }
  }

  // 半端な中心座標・半径は円の輪郭をぼかすため、タイルと直径を整数 px に揃える。
  // タイルを偶数にすると中心も整数座標になり、繰り返し境界でのにじみも防げる。
  const dotSize = Math.max(2, Math.round(size / 2) * 2)
  const diameter = Math.round((dotSize * weight) / 2) * 2
  const radius = diameter / 2
  return {
    backgroundImage: `radial-gradient(circle at 50% 50%, ${color} ${radius}px, transparent ${radius}px)`,
    backgroundSize: `${dotSize}px ${dotSize}px`,
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
