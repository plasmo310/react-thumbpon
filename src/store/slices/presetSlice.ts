import { createId } from '../../lib/core/factory'
import { createPatchers } from '../helpers'
import type { BackgroundPreset, TextPreset, TextStyle } from '../../types'
import type { SliceCreator } from '../types'

export type PresetSlice = {
  textPresets: TextPreset[]
  backgroundPresets: BackgroundPreset[]

  addTextPreset: (name: string, style: TextStyle) => void
  applyTextPreset: (presetId: string, layerId: string) => void
  removeTextPreset: (presetId: string) => void
  addBackgroundPreset: (name: string) => void
  applyBackgroundPreset: (presetId: string) => void
  removeBackgroundPreset: (presetId: string) => void
  setPresets: (presets: {
    textPresets?: TextPreset[]
    backgroundPresets?: BackgroundPreset[]
  }) => void
}

/** よく使う見た目を名前を付けて保存し、他のレイヤーやサムネイルに使い回すためのもの */
export const createPresetSlice: SliceCreator<PresetSlice> = (set, get) => {
  const { current, patchCurrent, patchLayers } = createPatchers(set, get)

  return {
    textPresets: [],
    backgroundPresets: [],

    /**
     * テキストの見た目をプリセットとして保存する。
     *
     * @param name  一覧に出す名前
     * @param style 保存する見た目。extractTextStyle で取り出したもの
     */
    addTextPreset: (name, style) =>
      set((s) => ({ textPresets: [...s.textPresets, { id: createId(), name, style }] })),

    /**
     * プリセットの見た目をテキストレイヤーに適用する。位置やサイズは変えない。
     *
     * @param presetId 適用するプリセットの id
     * @param layerId  適用先のレイヤーの id。テキスト以外なら何もしない
     */
    applyTextPreset: (presetId, layerId) => {
      const preset = get().textPresets.find((p) => p.id === presetId)
      if (!preset) return
      patchLayers((layers) =>
        layers.map((l) => (l.id === layerId && l.type === 'text' ? { ...l, ...preset.style } : l)),
      )
    },

    /**
     * テキストプリセットを削除する。
     *
     * @param presetId 削除するプリセットの id
     */
    removeTextPreset: (presetId) =>
      set((s) => ({ textPresets: s.textPresets.filter((p) => p.id !== presetId) })),

    /**
     * 現在の背景設定をプリセットとして保存する。
     *
     * @param name 一覧に出す名前
     */
    addBackgroundPreset: (name) => {
      const thumbnail = current()
      if (!thumbnail) return
      set((s) => ({
        backgroundPresets: [
          ...s.backgroundPresets,
          { id: createId(), name, background: { ...thumbnail.background } },
        ],
      }))
    },

    /**
     * プリセットの背景を現在のサムネイルに適用する。
     *
     * @param presetId 適用するプリセットの id
     */
    applyBackgroundPreset: (presetId) => {
      const preset = get().backgroundPresets.find((p) => p.id === presetId)
      if (!preset) return
      patchCurrent((t) => ({ ...t, background: { ...preset.background } }))
    },

    /**
     * 背景プリセットを削除する。
     *
     * @param presetId 削除するプリセットの id
     */
    removeBackgroundPreset: (presetId) =>
      set((s) => ({ backgroundPresets: s.backgroundPresets.filter((p) => p.id !== presetId) })),

    /**
     * プリセットをまとめて差し替える。プロジェクト読み込みで使う。
     *
     * @param presets 省略した種別は現在の内容を残す
     */
    setPresets: ({ textPresets, backgroundPresets }) =>
      set((s) => ({
        textPresets: textPresets ?? s.textPresets,
        backgroundPresets: backgroundPresets ?? s.backgroundPresets,
      })),
  }
}
