import { DEFAULT_EFFECTS, type Effects } from '../../types'

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
