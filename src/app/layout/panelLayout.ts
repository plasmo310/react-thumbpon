/** 画面の分割サイズ。編集内容ではないので、プロジェクトではなくブラウザ側に持つ */
export type PanelLayout = {
  /** 左サイドバーの幅(px) */
  sidebarWidth: number
  /** サムネイルパネルの高さ(px) */
  thumbnailHeight: number
  /** 素材パネルの高さ(px) */
  assetHeight: number
}

const STORAGE_KEY = 'thumbpon:panel-layout'

const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  sidebarWidth: 340,
  thumbnailHeight: 220,
  assetHeight: 220,
}

/**
 * 保存済みの分割サイズを読む。
 * 描画前に同期で必要なので IndexedDB ではなく localStorage を使っている。
 */
export function loadPanelLayout(): PanelLayout {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PANEL_LAYOUT
    const parsed = JSON.parse(raw) as Partial<PanelLayout>
    const pick = (value: unknown, fallback: number) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
    return {
      sidebarWidth: pick(parsed.sidebarWidth, DEFAULT_PANEL_LAYOUT.sidebarWidth),
      thumbnailHeight: pick(parsed.thumbnailHeight, DEFAULT_PANEL_LAYOUT.thumbnailHeight),
      assetHeight: pick(parsed.assetHeight, DEFAULT_PANEL_LAYOUT.assetHeight),
    }
  } catch {
    // プライベートモードなどで読めなくても既定値で動けばよい
    return DEFAULT_PANEL_LAYOUT
  }
}

/**
 * 分割サイズを保存する。
 *
 * @param layout 保存する分割サイズ
 */
export function savePanelLayout(layout: PanelLayout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // 保存できなくても編集は続けられるので黙って捨てる
  }
}
