import { create } from 'zustand'
import {
  BACKGROUND_ID,
  CANVAS_PRESETS,
  DEFAULT_BACKGROUND,
  FONT_OPTIONS,
  type AssetMeta,
  type Background,
  type CanvasSize,
  type ImageLayer,
  type Layer,
  type TextLayer,
} from '../types/editor'
import { deleteAsset, loadAssets, readImageSize, saveAsset } from '../lib/assetStore'
import { fitInto } from '../lib/geometry'

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

type EditorState = {
  canvas: CanvasSize
  background: Background
  layers: Layer[]
  selectedId: string | null
  assets: AssetMeta[]
  assetsLoaded: boolean

  setCanvasSize: (size: CanvasSize) => void
  setBackground: (patch: Partial<Background>) => void
  select: (id: string | null) => void

  addImageLayer: (assetId: string, center?: { x: number; y: number }) => void
  addTextLayer: () => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  moveLayer: (id: string, direction: 1 | -1) => void
  nudgeLayer: (id: string, dx: number, dy: number) => void

  initAssets: () => Promise<void>
  addAssetFiles: (files: File[]) => Promise<AssetMeta[]>
  removeAsset: (id: string) => Promise<void>
}

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

export const useEditorStore = create<EditorState>((set, get) => ({
  canvas: { width: CANVAS_PRESETS[0].width, height: CANVAS_PRESETS[0].height },
  background: DEFAULT_BACKGROUND,
  layers: [],
  selectedId: null,
  assets: [],
  assetsLoaded: false,

  setCanvasSize: (size) => set({ canvas: size }),

  setBackground: (patch) => set((s) => ({ background: { ...s.background, ...patch } })),

  select: (id) => set({ selectedId: id }),

  addImageLayer: (assetId, center) => {
    const { assets, canvas, layers } = get()
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return
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
    set({ layers: [...layers, layer], selectedId: layer.id })
  },

  addTextLayer: () => {
    const { canvas, layers } = get()
    const width = Math.round(canvas.width * 0.6)
    const fontSize = Math.round(canvas.height * 0.09)
    const layer: TextLayer = {
      ...baseLayer('テキスト'),
      type: 'text',
      text: 'テキストを入力',
      width,
      x: Math.round((canvas.width - width) / 2),
      y: Math.round(canvas.height / 2 - fontSize),
      fontFamily: FONT_OPTIONS[0].value,
      fontSize,
      fontWeight: 900,
      fontStyle: 'normal',
      textAlign: 'center',
      letterSpacing: 0,
      lineHeight: 1.3,
      color: '#25282D',
    }
    set({ layers: [...layers, layer], selectedId: layer.id })
  },

  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
    })),

  removeLayer: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  duplicateLayer: (id) => {
    const { layers } = get()
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
    const next = [...layers]
    next.splice(index + 1, 0, copy)
    set({ layers: next, selectedId: copy.id })
  },

  /** direction: 1 = 前面へ / -1 = 背面へ */
  moveLayer: (id, direction) => {
    const { layers } = get()
    const index = layers.findIndex((l) => l.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= layers.length) return
    const next = [...layers]
    ;[next[index], next[target]] = [next[target], next[index]]
    set({ layers: next })
  },

  nudgeLayer: (id, dx, dy) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
    })),

  initAssets: async () => {
    const assets = await loadAssets()
    set({ assets, assetsLoaded: true })
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
    const background = get().background
    set({
      assets,
      layers: get().layers.filter((l) => l.type !== 'image' || l.assetId !== id),
      background:
        background.assetId === id ? { ...background, assetId: null } : background,
    })
  },
}))

export const useSelectedLayer = (): Layer | null => {
  const selectedId = useEditorStore((s) => s.selectedId)
  const layers = useEditorStore((s) => s.layers)
  if (!selectedId || selectedId === BACKGROUND_ID) return null
  return layers.find((l) => l.id === selectedId) ?? null
}
