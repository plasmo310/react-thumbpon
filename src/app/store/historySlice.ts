import type { EditorState, SavedDocument, SliceCreator } from './index'

/** 積み過ぎて無限にメモリを使わないための上限 */
const HISTORY_LIMIT = 50

export type HistorySlice = {
  /** 元に戻せる過去のドキュメント。末尾がひとつ前の状態 */
  historyPast: SavedDocument[]
  /** やり直せる未来のドキュメント。末尾が直後の状態 */
  historyFuture: SavedDocument[]

  /** 変更を加える直前の状態を履歴に積む。積んだ後はやり直し履歴を捨てる */
  recordHistory: () => void
  /** ひとつ前の状態に戻す */
  undo: () => void
  /** 戻した内容をやり直す */
  redo: () => void
  /** 履歴を空にする。別のプロジェクトを読み込むときなど、続きを戻せても意味がないときに使う */
  resetHistory: () => void
}

/**
 * 保存対象と同じ範囲だけを取り出す。
 * 選択状態やガイド線のようなその場限りのものを含めると、undo のたびに
 * 無関係な UI 状態まで巻き戻ってしまうため。
 */
function snapshot(state: EditorState): SavedDocument {
  return {
    folders: state.folders,
    thumbnails: state.thumbnails,
    currentThumbnailId: state.currentThumbnailId,
    textPresets: state.textPresets,
    backgroundPresets: state.backgroundPresets,
    snapEnabled: state.snapEnabled,
  }
}

/**
 * Undo/Redo。history の単位はドキュメント全体のスナップショットにしてある。
 * 呼び出し側（キャンバスのドラッグ開始やレイヤー操作）が変更の直前に一度だけ
 * `recordHistory` を呼ぶ前提で、ここでは積む・戻すだけを行う。
 */
export const createHistorySlice: SliceCreator<HistorySlice> = (set) => ({
  historyPast: [],
  historyFuture: [],

  recordHistory: () =>
    set((s) => ({
      historyPast: [...s.historyPast, snapshot(s)].slice(-HISTORY_LIMIT),
      historyFuture: [],
    })),

  undo: () =>
    set((s) => {
      if (s.historyPast.length === 0) return s
      const previous = s.historyPast[s.historyPast.length - 1]
      return {
        folders: previous.folders,
        thumbnails: previous.thumbnails,
        // 保存データ由来で null もあり得る型なので、その場合は現在の編集対象を保つ
        currentThumbnailId: previous.currentThumbnailId ?? s.currentThumbnailId,
        textPresets: previous.textPresets,
        backgroundPresets: previous.backgroundPresets,
        snapEnabled: previous.snapEnabled,
        historyPast: s.historyPast.slice(0, -1),
        historyFuture: [...s.historyFuture, snapshot(s)],
        selectedId: null,
        selectedIds: [],
        cropping: false,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.historyFuture.length === 0) return s
      const next = s.historyFuture[s.historyFuture.length - 1]
      return {
        folders: next.folders,
        thumbnails: next.thumbnails,
        currentThumbnailId: next.currentThumbnailId ?? s.currentThumbnailId,
        textPresets: next.textPresets,
        backgroundPresets: next.backgroundPresets,
        snapEnabled: next.snapEnabled,
        historyFuture: s.historyFuture.slice(0, -1),
        historyPast: [...s.historyPast, snapshot(s)],
        selectedId: null,
        selectedIds: [],
        cropping: false,
      }
    }),

  resetHistory: () => set({ historyPast: [], historyFuture: [] }),
})
