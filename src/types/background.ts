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
