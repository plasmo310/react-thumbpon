import { create } from 'zustand'
import {
  BACKGROUND_ID,
  BUILTIN_FONTS,
  CANVAS_PRESETS,
  DEFAULT_BACKGROUND,
  type AssetMeta,
  type Background,
  type CanvasSize,
  type FontEntry,
  type Folder,
  type ImageLayer,
  type Layer,
  type TextLayer,
  type TextPreset,
  type TextStyle,
  type Thumbnail,
  type BackgroundPreset,
  TEXT_STYLE_KEYS,
} from '../types'
import { deleteAsset, loadAssets, readImageSize, saveAsset } from '../lib/storage/assetRepo'
import { fitInto } from '../lib/core/geometry'

export const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const DEFAULT_CANVAS: CanvasSize = {
  width: CANVAS_PRESETS[0].width,
  height: CANVAS_PRESETS[0].height,
}

export function createThumbnail(
  name: string,
  folderId: string | null = null,
  canvas: CanvasSize = DEFAULT_CANVAS,
): Thumbnail {
  return {
    id: createId(),
    name,
    folderId,
    canvas: { ...canvas },
    background: { ...DEFAULT_BACKGROUND },
    layers: [],
  }
}

/** レイヤー配列は index 0 が最背面。パネルは配列順に上から並べるので「下が前面」になる */
type EditorState = {
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string
  selectedId: string | null
  assets: AssetMeta[]
  fonts: FontEntry[]
  clipboard: Thumbnail | null
  ready: boolean
  snapEnabled: boolean
  /** ドラッグ中に表示するスナップガイド。永続化しない */
  guides: { x: number[]; y: number[] }
  textPresets: TextPreset[]
  backgroundPresets: BackgroundPreset[]

  // --- thumbnail / folder ---
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

  // --- layer ---
  setBackground: (patch: Partial<Background>) => void
  select: (id: string | null) => void
  addImageLayer: (assetId: string, center?: { x: number; y: number }) => void
  addTextLayer: () => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  moveLayer: (id: string, direction: 1 | -1) => void
  reorderLayer: (fromIndex: number, insertIndex: number) => void
  nudgeLayer: (id: string, dx: number, dy: number) => void

  // --- asset / font ---
  initAssets: () => Promise<void>
  addAssetFiles: (files: File[]) => Promise<AssetMeta[]>
  removeAsset: (id: string) => Promise<void>
  setFonts: (fonts: FontEntry[]) => void
  addFonts: (fonts: FontEntry[]) => void

  // --- snap ---
  setSnapEnabled: (enabled: boolean) => void
  setGuides: (guides: { x: number[]; y: number[] }) => void

  // --- preset ---
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

  // --- project ---
  loadProject: (data: {
    folders: Folder[]
    thumbnails: Thumbnail[]
    currentThumbnailId?: string | null
    textPresets?: TextPreset[]
    backgroundPresets?: BackgroundPreset[]
  }) => void
  setReady: (ready: boolean) => void
}

const firstThumbnail = createThumbnail('サムネイル 1')

const baseLayer = (name: string) => ({
  id: createId(),
  name,
  x: 0,
  y: 0,
  width: 100,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
})

export const useEditorStore = create<EditorState>((set, get) => {
  /** 現在のサムネイルだけを差し替える */
  const patchCurrent = (updater: (thumbnail: Thumbnail) => Thumbnail) =>
    set((s) => ({
      thumbnails: s.thumbnails.map((t) => (t.id === s.currentThumbnailId ? updater(t) : t)),
    }))

  const patchLayers = (updater: (layers: Layer[]) => Layer[]) =>
    patchCurrent((t) => ({ ...t, layers: updater(t.layers) }))

  const current = () => {
    const s = get()
    return s.thumbnails.find((t) => t.id === s.currentThumbnailId) ?? s.thumbnails[0]
  }

  return {
    folders: [],
    thumbnails: [firstThumbnail],
    currentThumbnailId: firstThumbnail.id,
    selectedId: null,
    assets: [],
    fonts: BUILTIN_FONTS,
    clipboard: null,
    ready: false,
    snapEnabled: true,
    guides: { x: [], y: [] },
    textPresets: [],
    backgroundPresets: [],

    selectThumbnail: (id) => set({ currentThumbnailId: id, selectedId: null }),

    addThumbnail: (folderId = null) => {
      const { thumbnails } = get()
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

    renameThumbnail: (id, name) =>
      set((s) => ({ thumbnails: s.thumbnails.map((t) => (t.id === id ? { ...t, name } : t)) })),

    duplicateThumbnail: (id) => {
      const { thumbnails } = get()
      const index = thumbnails.findIndex((t) => t.id === id)
      if (index < 0) return
      const copy = cloneThumbnail(thumbnails[index], `${thumbnails[index].name} のコピー`)
      const next = [...thumbnails]
      next.splice(index + 1, 0, copy)
      set({ thumbnails: next, currentThumbnailId: copy.id, selectedId: null })
    },

    removeThumbnail: (id) => {
      const { thumbnails, currentThumbnailId } = get()
      if (thumbnails.length <= 1) return
      const index = thumbnails.findIndex((t) => t.id === id)
      const next = thumbnails.filter((t) => t.id !== id)
      // 削除したら「ひとつ上」のサムネイルへ移る
      const nextCurrent =
        currentThumbnailId === id
          ? next[Math.max(0, index - 1)].id
          : currentThumbnailId
      set({ thumbnails: next, currentThumbnailId: nextCurrent, selectedId: null })
    },

    copyThumbnail: (id) => {
      const thumbnail = get().thumbnails.find((t) => t.id === id)
      if (thumbnail) set({ clipboard: thumbnail })
    },

    pasteThumbnail: (folderId) => {
      const { clipboard, thumbnails } = get()
      if (!clipboard) return
      const copy = cloneThumbnail(clipboard, `${clipboard.name} のコピー`)
      copy.folderId = folderId
      set({ thumbnails: [...thumbnails, copy], currentThumbnailId: copy.id, selectedId: null })
    },

    moveThumbnailToFolder: (id, folderId) =>
      set((s) => ({ thumbnails: s.thumbnails.map((t) => (t.id === id ? { ...t, folderId } : t)) })),

    setCanvasSize: (size) => patchCurrent((t) => ({ ...t, canvas: size })),

    addFolder: () =>
      set((s) => ({
        folders: [
          ...s.folders,
          { id: createId(), name: `フォルダ ${s.folders.length + 1}`, collapsed: false },
        ],
      })),

    renameFolder: (id, name) =>
      set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),

    toggleFolder: (id) =>
      set((s) => ({
        folders: s.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
      })),

    /** フォルダを削除しても中のサムネイルは残し、未分類へ移す */
    removeFolder: (id) =>
      set((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        thumbnails: s.thumbnails.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)),
      })),

    setBackground: (patch) =>
      patchCurrent((t) => ({ ...t, background: { ...t.background, ...patch } })),

    select: (id) => set({ selectedId: id }),

    addImageLayer: (assetId, center) => {
      const { assets } = get()
      const thumbnail = current()
      const asset = assets.find((a) => a.id === assetId)
      if (!asset || !thumbnail) return
      const { canvas } = thumbnail
      const size = fitInto(asset.width, asset.height, canvas.width * 0.8, canvas.height * 0.8)
      const cx = center?.x ?? canvas.width / 2
      const cy = center?.y ?? canvas.height / 2
      const layer: ImageLayer = {
        ...baseLayer(asset.name),
        type: 'image',
        assetId,
        width: size.width,
        height: size.height,
        x: Math.round(cx - size.width / 2),
        y: Math.round(cy - size.height / 2),
      }
      patchLayers((layers) => [...layers, layer])
      set({ selectedId: layer.id })
    },

    addTextLayer: () => {
      const thumbnail = current()
      if (!thumbnail) return
      const { canvas } = thumbnail
      const width = Math.round(canvas.width * 0.6)
      const fontSize = Math.round(canvas.height * 0.09)
      const layer: TextLayer = {
        ...baseLayer('テキスト'),
        type: 'text',
        text: 'テキストを入力',
        width,
        x: Math.round((canvas.width - width) / 2),
        y: Math.round(canvas.height / 2 - fontSize),
        fontFamily: BUILTIN_FONTS[0].family,
        fontSize,
        fontWeight: 900,
        fontStyle: 'normal',
        textAlign: 'center',
        letterSpacing: 0,
        lineHeight: 1.3,
        color: '#25282D',
        strokeWidth: 0,
        strokeColor: '#FFFFFF',
      }
      patchLayers((layers) => [...layers, layer])
      set({ selectedId: layer.id })
    },

    updateLayer: (id, patch) =>
      patchLayers((layers) =>
        layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      ),

    removeLayer: (id) => {
      patchLayers((layers) => layers.filter((l) => l.id !== id))
      if (get().selectedId === id) set({ selectedId: null })
    },

    duplicateLayer: (id) => {
      const layers = current()?.layers ?? []
      const index = layers.findIndex((l) => l.id === id)
      if (index < 0) return
      const source = layers[index]
      const copy: Layer = {
        ...source,
        id: createId(),
        name: `${source.name} のコピー`,
        x: source.x + 24,
        y: source.y + 24,
      }
      patchLayers((list) => {
        const next = [...list]
        next.splice(index + 1, 0, copy)
        return next
      })
      set({ selectedId: copy.id })
    },

    /** direction: 1 = 前面へ / -1 = 背面へ */
    moveLayer: (id, direction) =>
      patchLayers((layers) => {
        const index = layers.findIndex((l) => l.id === id)
        const target = index + direction
        if (index < 0 || target < 0 || target >= layers.length) return layers
        const next = [...layers]
        ;[next[index], next[target]] = [next[target], next[index]]
        return next
      }),

    /** insertIndex は「元の配列のこの要素の手前に入れる」位置(0..length) */
    reorderLayer: (fromIndex, insertIndex) =>
      patchLayers((layers) => {
        if (fromIndex < 0 || fromIndex >= layers.length) return layers
        if (insertIndex === fromIndex || insertIndex === fromIndex + 1) return layers
        const next = [...layers]
        const [moved] = next.splice(fromIndex, 1)
        const adjusted = insertIndex > fromIndex ? insertIndex - 1 : insertIndex
        next.splice(Math.max(0, Math.min(next.length, adjusted)), 0, moved)
        return next
      }),

    nudgeLayer: (id, dx, dy) =>
      patchLayers((layers) =>
        layers.map((l) => (l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
      ),

    initAssets: async () => {
      const assets = await loadAssets()
      set({ assets })
    },

    addAssetFiles: async (files) => {
      const added: AssetMeta[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const { width, height } = await readImageSize(file)
        const meta: AssetMeta = {
          id: createId(),
          name: file.name,
          mime: file.type,
          width,
          height,
          createdAt: Date.now(),
        }
        const assets = [...get().assets, meta]
        await saveAsset(meta, file, assets)
        set({ assets })
        added.push(meta)
      }
      return added
    },

    removeAsset: async (id) => {
      const assets = get().assets.filter((a) => a.id !== id)
      await deleteAsset(id, assets)
      set({
        assets,
        thumbnails: get().thumbnails.map((t) => ({
          ...t,
          layers: t.layers.filter((l) => l.type !== 'image' || l.assetId !== id),
          background: t.background.assetId === id ? { ...t.background, assetId: null } : t.background,
        })),
      })
    },

    setFonts: (fonts) => set({ fonts }),

    addFonts: (fonts) =>
      set((s) => {
        const known = new Set(s.fonts.map((f) => f.family))
        return { fonts: [...s.fonts, ...fonts.filter((f) => !known.has(f.family))] }
      }),

    setSnapEnabled: (snapEnabled) => set({ snapEnabled, guides: { x: [], y: [] } }),

    /** ドラッグ中に毎フレーム呼ばれるので、変化が無ければ更新しない */
    setGuides: (guides) =>
      set((s) => {
        const same = (a: number[], b: number[]) =>
          a.length === b.length && a.every((v, i) => v === b[i])
        if (same(s.guides.x, guides.x) && same(s.guides.y, guides.y)) return s
        return { guides }
      }),

    addTextPreset: (name, style) =>
      set((s) => ({ textPresets: [...s.textPresets, { id: createId(), name, style }] })),

    applyTextPreset: (presetId, layerId) => {
      const preset = get().textPresets.find((p) => p.id === presetId)
      if (!preset) return
      patchLayers((layers) =>
        layers.map((l) => (l.id === layerId && l.type === 'text' ? { ...l, ...preset.style } : l)),
      )
    },

    removeTextPreset: (presetId) =>
      set((s) => ({ textPresets: s.textPresets.filter((p) => p.id !== presetId) })),

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

    applyBackgroundPreset: (presetId) => {
      const preset = get().backgroundPresets.find((p) => p.id === presetId)
      if (!preset) return
      patchCurrent((t) => ({ ...t, background: { ...preset.background } }))
    },

    removeBackgroundPreset: (presetId) =>
      set((s) => ({ backgroundPresets: s.backgroundPresets.filter((p) => p.id !== presetId) })),

    setPresets: ({ textPresets, backgroundPresets }) =>
      set((s) => ({
        textPresets: textPresets ?? s.textPresets,
        backgroundPresets: backgroundPresets ?? s.backgroundPresets,
      })),

    loadProject: ({ folders, thumbnails, currentThumbnailId, textPresets, backgroundPresets }) => {
      const list = thumbnails.length > 0 ? thumbnails : [createThumbnail('サムネイル 1')]
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

    setReady: (ready) => set({ ready }),
  }
})

/** テキストレイヤーから見た目だけを取り出す */
export function extractTextStyle(layer: TextLayer): TextStyle {
  const style = {} as TextStyle
  for (const key of TEXT_STYLE_KEYS) {
    Object.assign(style, { [key]: layer[key] })
  }
  return style
}

function cloneThumbnail(source: Thumbnail, name: string): Thumbnail {
  return {
    ...source,
    id: createId(),
    name,
    canvas: { ...source.canvas },
    background: { ...source.background },
    layers: source.layers.map((l) => ({ ...l, id: createId() })),
  }
}

export const useCurrentThumbnail = (): Thumbnail => {
  const thumbnails = useEditorStore((s) => s.thumbnails)
  const currentThumbnailId = useEditorStore((s) => s.currentThumbnailId)
  return thumbnails.find((t) => t.id === currentThumbnailId) ?? thumbnails[0]
}

export const useSelectedLayer = (): Layer | null => {
  const selectedId = useEditorStore((s) => s.selectedId)
  const thumbnail = useCurrentThumbnail()
  if (!selectedId || selectedId === BACKGROUND_ID) return null
  return thumbnail.layers.find((l) => l.id === selectedId) ?? null
}
