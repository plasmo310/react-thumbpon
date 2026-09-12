import { DEFAULT_CANVAS, cloneThumbnail, createId, createThumbnail } from '../../lib/core/factory'
import { normalizeThumbnails } from '../../lib/core/project'
import { createPatchers } from '../helpers'
import type { BackgroundPreset, CanvasSize, Folder, TextPreset, Thumbnail } from '../../types'
import type { SliceCreator } from '../types'

export type ThumbnailSlice = {
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string
  /** コピーしたサムネイル。貼り付けるまで保持する */
  clipboard: Thumbnail | null

  selectThumbnail: (id: string) => void
  addThumbnail: (folderId?: string | null) => void
  renameThumbnail: (id: string, name: string) => void
  duplicateThumbnail: (id: string) => void
  removeThumbnail: (id: string) => void
  copyThumbnail: (id: string) => void
  pasteThumbnail: (folderId: string | null) => void
  moveThumbnailToFolder: (id: string, folderId: string | null) => void
  setCanvasSize: (size: CanvasSize) => void

  addFolder: () => void
  renameFolder: (id: string, name: string) => void
  toggleFolder: (id: string) => void
  removeFolder: (id: string) => void

  loadProject: (data: {
    folders: Folder[]
    thumbnails: Thumbnail[]
    currentThumbnailId?: string | null
    textPresets?: TextPreset[]
    backgroundPresets?: BackgroundPreset[]
  }) => void
}

const firstThumbnail = createThumbnail('サムネイル 1')

/** サムネイルとフォルダの管理。プロジェクト全体の読み込みもここで行う */
export const createThumbnailSlice: SliceCreator<ThumbnailSlice> = (set, get) => {
  const { current, patchCurrent } = createPatchers(set, get)

  return {
    folders: [],
    thumbnails: [firstThumbnail],
    currentThumbnailId: firstThumbnail.id,
    clipboard: null,

    /**
     * 編集対象のサムネイルを切り替える。
     *
     * @param id 切り替え先のサムネイルの id
     */
    selectThumbnail: (id) => set({ currentThumbnailId: id, selectedId: null }),

    /**
     * サムネイルを追加して、そのまま編集対象にする。
     *
     * @param folderId 追加先のフォルダ。null / 省略で未分類
     */
    addThumbnail: (folderId = null) => {
      const { thumbnails } = get()
      // 今のキャンバスサイズを引き継ぐ方が、続けて作るときの手間が少ない
      const thumbnail = createThumbnail(
        `サムネイル ${thumbnails.length + 1}`,
        folderId ?? null,
        current()?.canvas ?? DEFAULT_CANVAS,
      )
      set({
        thumbnails: [...thumbnails, thumbnail],
        currentThumbnailId: thumbnail.id,
        selectedId: null,
      })
    },

    /**
     * サムネイルの名前を変える。
     *
     * @param id   対象のサムネイルの id
     * @param name 新しい名前。PNG書き出しのファイル名にもなる
     */
    renameThumbnail: (id, name) =>
      set((s) => ({ thumbnails: s.thumbnails.map((t) => (t.id === id ? { ...t, name } : t)) })),

    /**
     * サムネイルを複製してすぐ下に挿し、複製の方を編集対象にする。
     *
     * @param id 複製元のサムネイルの id
     */
    duplicateThumbnail: (id) => {
      const { thumbnails } = get()
      const index = thumbnails.findIndex((t) => t.id === id)
      if (index < 0) return
      const copy = cloneThumbnail(thumbnails[index], `${thumbnails[index].name} のコピー`)
      const next = [...thumbnails]
      next.splice(index + 1, 0, copy)
      set({ thumbnails: next, currentThumbnailId: copy.id, selectedId: null })
    },

    /**
     * サムネイルを削除する。最後の1枚は消せない。
     *
     * @param id 削除するサムネイルの id
     */
    removeThumbnail: (id) => {
      const { thumbnails, currentThumbnailId } = get()
      if (thumbnails.length <= 1) return
      const index = thumbnails.findIndex((t) => t.id === id)
      const next = thumbnails.filter((t) => t.id !== id)
      // 削除したら「ひとつ上」のサムネイルへ移る
      const nextCurrent =
        currentThumbnailId === id ? next[Math.max(0, index - 1)].id : currentThumbnailId
      set({ thumbnails: next, currentThumbnailId: nextCurrent, selectedId: null })
    },

    /**
     * サムネイルをクリップボードに控える。
     *
     * @param id コピー元のサムネイルの id
     */
    copyThumbnail: (id) => {
      const thumbnail = get().thumbnails.find((t) => t.id === id)
      if (thumbnail) set({ clipboard: thumbnail })
    },

    /**
     * 控えたサムネイルを複製として貼り付ける。
     *
     * @param folderId 貼り付け先のフォルダ。null で未分類
     */
    pasteThumbnail: (folderId) => {
      const { clipboard, thumbnails } = get()
      if (!clipboard) return
      const copy = cloneThumbnail(clipboard, `${clipboard.name} のコピー`)
      copy.folderId = folderId
      set({ thumbnails: [...thumbnails, copy], currentThumbnailId: copy.id, selectedId: null })
    },

    /**
     * サムネイルを別のフォルダへ移す。
     *
     * @param id       移すサムネイルの id
     * @param folderId 移動先のフォルダ。null で未分類
     */
    moveThumbnailToFolder: (id, folderId) =>
      set((s) => ({ thumbnails: s.thumbnails.map((t) => (t.id === id ? { ...t, folderId } : t)) })),

    /**
     * 現在のサムネイルのキャンバスサイズを変える。サイズはサムネイルごとに持つ。
     *
     * @param size 新しい実寸サイズ
     */
    setCanvasSize: (size) => patchCurrent((t) => ({ ...t, canvas: size })),

    /** フォルダを追加する */
    addFolder: () =>
      set((s) => ({
        folders: [
          ...s.folders,
          { id: createId(), name: `フォルダ ${s.folders.length + 1}`, collapsed: false },
        ],
      })),

    /**
     * フォルダの名前を変える。
     *
     * @param id   対象のフォルダの id
     * @param name 新しい名前
     */
    renameFolder: (id, name) =>
      set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),

    /**
     * フォルダの開閉を切り替える。
     *
     * @param id 対象のフォルダの id
     */
    toggleFolder: (id) =>
      set((s) => ({
        folders: s.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
      })),

    /**
     * フォルダを削除する。中のサムネイルは消さず未分類へ移す。
     *
     * @param id 削除するフォルダの id
     */
    removeFolder: (id) =>
      set((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        thumbnails: s.thumbnails.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)),
      })),

    /**
     * プロジェクトの内容で全体を差し替える。ファイル読み込みと起動時の復元で使う。
     * プリセットも同時に入れ替わるが、主対象がサムネイルのためこの slice に置いている。
     *
     * @param data 読み込んだ内容。サムネイルが空なら新規1枚で始める。
     *             古い保存内容には後から増えたフィールドが無いのでここで補う
     */
    loadProject: ({ folders, thumbnails, currentThumbnailId, textPresets, backgroundPresets }) => {
      const list =
        thumbnails.length > 0 ? normalizeThumbnails(thumbnails) : [createThumbnail('サムネイル 1')]
      const wanted = list.find((t) => t.id === currentThumbnailId)
      set((s) => ({
        folders,
        thumbnails: list,
        currentThumbnailId: (wanted ?? list[0]).id,
        selectedId: null,
        textPresets: textPresets ?? s.textPresets,
        backgroundPresets: backgroundPresets ?? s.backgroundPresets,
      }))
    },
  }
}
