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

/** 背景行を選択状態として表すための予約 id。レイヤーの id と衝突しない値にする */
export const BACKGROUND_ID = '__background__'
