import type { EditorState, SavedDocument, SliceCreator } from './index'
import type { TextEditingSession } from './textSlice'

type HistoryDocument = SavedDocument & { textEditing?: TextEditingSession | null }

/** 積み過ぎて無限にメモリを使わないための上限 */
const HISTORY_LIMIT = 50

export type HistorySlice = {
  /** 元に戻せる過去のドキュメント。末尾がひとつ前の状態 */
  historyPast: HistoryDocument[]
  /** やり直せる未来のドキュメント。末尾が直後の状態 */
  historyFuture: HistoryDocument[]

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
 * 保存対象の内容と、編集中に限って使う文字選択のブックマークを取り出す。
 * ガイド線などは含めず、編集を終了した後のUndoで入力欄を開き直さないようにする。
 */
function snapshot(state: EditorState): HistoryDocument {
  return {
    folders: state.folders,
    thumbnails: state.thumbnails,
    currentThumbnailId: state.currentThumbnailId,
    textPresets: state.textPresets,
    backgroundPresets: state.backgroundPresets,
    snapEnabled: state.snapEnabled,
    textEditing: state.textEditing,
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
      textInputGroup: null,
    })),

  undo: () =>
    set((s) => {
      if (s.historyPast.length === 0) return s
      const previous = s.historyPast[s.historyPast.length - 1]
      const editing = restoreEditing(s, previous)
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
        selectedId: editing?.layerId ?? null,
        selectedIds: editing ? [editing.layerId] : [],
        textEditing: editing,
        textInputGroup: null,
        cropping: false,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.historyFuture.length === 0) return s
      const next = s.historyFuture[s.historyFuture.length - 1]
      const editing = restoreEditing(s, next)
      return {
        folders: next.folders,
        thumbnails: next.thumbnails,
        currentThumbnailId: next.currentThumbnailId ?? s.currentThumbnailId,
        textPresets: next.textPresets,
        backgroundPresets: next.backgroundPresets,
        snapEnabled: next.snapEnabled,
        historyFuture: s.historyFuture.slice(0, -1),
        historyPast: [...s.historyPast, snapshot(s)],
        selectedId: editing?.layerId ?? null,
        selectedIds: editing ? [editing.layerId] : [],
        textEditing: editing,
        textInputGroup: null,
        cropping: false,
      }
    }),

  resetHistory: () => set({ historyPast: [], historyFuture: [], textInputGroup: null }),
})

function restoreEditing(state: EditorState, document: HistoryDocument): TextEditingSession | null {
  const saved = document.textEditing
  if (!state.textEditing || !saved || state.textEditing.layerId !== saved.layerId) return null
  const layer = document.thumbnails
    .find((t) => t.id === document.currentThumbnailId)
    ?.layers.find((l) => l.id === saved.layerId)
  if (!layer || layer.type !== 'text' || layer.locked || !layer.visible) return null
  return { ...saved, surface: state.textEditing.surface, revision: state.textEditing.revision + 1 }
}
