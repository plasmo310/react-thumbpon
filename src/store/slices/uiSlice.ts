import type { SliceCreator } from '../types'

export type UiSlice = {
  /** 復元が終わったか。自動保存は これが true の間だけ動く */
  ready: boolean
  snapEnabled: boolean
  /** ドラッグ中に表示するスナップガイド。永続化しない */
  guides: { x: number[]; y: number[] }

  setReady: (ready: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setGuides: (guides: { x: number[]; y: number[] }) => void
}

/** スナップの設定やガイド線など、編集内容ではない画面まわりの状態 */
export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  ready: false,
  snapEnabled: true,
  guides: { x: [], y: [] },

  /**
   * 復元完了を知らせる。
   *
   * @param ready true にすると自動保存が動き始める
   */
  setReady: (ready) => set({ ready }),

  /**
   * スナップの有効・無効を切り替える。切り替え時に出しっぱなしのガイドを消す。
   *
   * @param enabled 有効にするか
   */
  setSnapEnabled: (snapEnabled) => set({ snapEnabled, guides: { x: [], y: [] } }),

  /**
   * 表示するガイド線を差し替える。
   * ドラッグ中に毎フレーム呼ばれるので、変化が無ければ更新しない。
   *
   * @param guides キャンバス実寸での縦線(x)・横線(y)の位置
   */
  setGuides: (guides) =>
    set((s) => {
      const same = (a: number[], b: number[]) =>
        a.length === b.length && a.every((v, i) => v === b[i])
      if (same(s.guides.x, guides.x) && same(s.guides.y, guides.y)) return s
      return { guides }
    }),
})
