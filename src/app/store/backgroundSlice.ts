import type { Background } from '@/domain/background'
import { DEFAULT_EFFECTS, type Effects } from '@/domain/effects'
import { createPatchers } from './patch'
import type { SliceCreator } from './index'

export type BackgroundSlice = {
  setBackground: (patch: Partial<Background>) => void
  setBackgroundEffects: (patch: Partial<Effects>) => void
}

/**
 * 現在のサムネイルの背景。状態は Thumbnail.background が持つのでここには置かない。
 * 画面上は「レイヤー一覧の一番上の行」だが、レイヤーではないので操作は分けてある。
 */
export const createBackgroundSlice: SliceCreator<BackgroundSlice> = (set, get) => {
  const { patchCurrent } = createPatchers(set, get)

  return {
    /**
     * 背景設定を部分的に更新する。
     *
     * @param patch 変更したい項目だけ。種別を切り替えても他の設定は残る
     */
    setBackground: (patch) =>
      patchCurrent((t) => ({ ...t, background: { ...t.background, ...patch } })),

    /**
     * 背景のエフェクトを部分的に更新する。
     * effects は入れ子なので setBackground の浅いマージでは潰れてしまうため、専用の口を用意する。
     *
     * @param patch 変更したい項目だけ
     */
    setBackgroundEffects: (patch) =>
      patchCurrent((t) => ({
        ...t,
        background: {
          ...t.background,
          effects: { ...DEFAULT_EFFECTS, ...t.background.effects, ...patch },
        },
      })),
  }
}
