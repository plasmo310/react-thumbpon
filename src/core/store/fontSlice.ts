import { BUILTIN_FONTS, type FontEntry } from '@/core/model/types'
import type { SliceCreator } from './index'

export type FontSlice = {
  fonts: FontEntry[]

  addFonts: (fonts: FontEntry[]) => void
}

/**
 * 選べるフォントの一覧。
 * フォントファイルの実体は IndexedDB 側にあり、ここには family 名だけを持つ。
 */
export const createFontSlice: SliceCreator<FontSlice> = (set) => ({
  fonts: BUILTIN_FONTS,

  /**
   * 一覧に追加する。family が既にあるものは読み飛ばす。
   *
   * @param fonts 追加したいフォント
   */
  addFonts: (fonts) =>
    set((s) => {
      const known = new Set(s.fonts.map((f) => f.family))
      return { fonts: [...s.fonts, ...fonts.filter((f) => !known.has(f.family))] }
    }),
})
