import type { SliceCreator } from './index'

/** 右クリックメニューを出す対象と位置。位置は画面座標(clientX / clientY) */
export type LayerMenu = { layerId: string; x: number; y: number }

export type UiSlice = {
  /** 復元が終わったか。自動保存は これが true の間だけ動く */
  ready: boolean
  snapEnabled: boolean
  /** ドラッグ中に表示するスナップガイド。永続化しない */
  guides: { x: number[]; y: number[] }
  /** レイヤー一覧で選択中の項目のプロパティ欄を開いているか */
  propertiesOpen: boolean
  /** 選択中の画像レイヤーをクロップ編集中か。キャンバスのハンドルの意味が変わる */
  cropping: boolean
  /** 開いている右クリックメニュー。閉じているときは null */
  layerMenu: LayerMenu | null

  setReady: (ready: boolean) => void
  setSnapEnabled: (enabled: boolean) => void
  setGuides: (guides: { x: number[]; y: number[] }) => void
  toggleProperties: () => void
  setCropping: (cropping: boolean) => void
  openLayerMenu: (layerId: string, x: number, y: number) => void
  closeLayerMenu: () => void
}

/** スナップの設定やガイド線など、編集内容ではない画面まわりの状態 */
export const createUiSlice: SliceCreator<UiSlice> = (set, get) => ({
  ready: false,
  snapEnabled: true,
  guides: { x: [], y: [] },
  propertiesOpen: true,
  cropping: false,
  layerMenu: null,

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

  /** 選択中の項目のプロパティ欄の開閉を切り替える。同じ行をもう一度押したときに使う */
  toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),

  /**
   * クロップ編集の開始・終了。
   *
   * @param cropping true の間はキャンバスのハンドルが枠のリサイズではなくクロップになる
   */
  setCropping: (cropping) => set({ cropping }),

  /**
   * レイヤーの右クリックメニューを開く。
   * メニューの操作対象がどれかをはっきりさせるため、対象を選択もする。
   *
   * @param layerId 対象のレイヤーの id
   * @param x       出す位置X（画面座標。event.clientX をそのまま渡す）
   * @param y       出す位置Y（画面座標）
   */
  openLayerMenu: (layerId, x, y) => {
    get().select(layerId)
    set({ layerMenu: { layerId, x, y } })
  },

  /** 右クリックメニューを閉じる */
  closeLayerMenu: () => set({ layerMenu: null }),
})
