import {
  formatTextRange,
  formatWholeText,
  insertionStyle,
  normalizeInlineStyles,
  normalizeTextRange,
} from '@/domain/text'
import type { InlineTextStyle, TextContent, TextRange } from '@/domain/text'
import type { TextLayer } from '@/domain/layer'
import type { SliceCreator } from './index'

/** 入力欄をまたいで保持する編集情報。DOM参照と保存対象データは含めない。 */
export type TextEditingSession = {
  layerId: string
  surface: 'canvas' | 'properties'
  range: TextRange
  target: 'whole' | 'selection'
  pendingStyle: InlineTextStyle | null
  revision: number
}

export type TextSlice = {
  textEditing: TextEditingSession | null
  textInputGroup: { layerId: string; time: number } | null
  beginTextEditing: (layerId: string, surface: TextEditingSession['surface']) => void
  endTextEditing: () => void
  selectTextRange: (range: TextRange) => void
  setTextFormatTarget: (target: TextEditingSession['target']) => void
  updateTextContent: (
    layerId: string,
    content: TextContent,
    range: TextRange,
    kind?: 'typing' | 'composition' | 'replace',
  ) => void
  formatText: (layerId: string, style: InlineTextStyle | null) => void
}

/**
 * 文字入力・部分書式・選択範囲を一つの更新経路で扱う。
 * DOM の編集は各入力部品が行い、ストアにはJSON化可能な確定内容だけを渡す。
 */
export const createTextSlice: SliceCreator<TextSlice> = (set, get) => {
  const find = (id: string): TextLayer | undefined => {
    const state = get()
    const thumbnail = state.thumbnails.find((t) => t.id === state.currentThumbnailId)
    const layer = thumbnail?.layers.find((l) => l.id === id)
    return layer?.type === 'text' ? layer : undefined
  }
  return {
    textEditing: null,
    textInputGroup: null,
    beginTextEditing: (layerId, surface) => {
      const layer = find(layerId)
      if (!layer || layer.locked || !layer.visible) return
      const previous = get().textEditing
      get().select(layerId)
      set({
        cropping: false,
        textInputGroup: null,
        textEditing:
          previous?.layerId === layerId
            ? { ...previous, surface, revision: previous.revision + 1 }
            : {
                layerId,
                surface,
                range: { start: layer.text.length, end: layer.text.length },
                target: 'whole',
                pendingStyle: null,
                revision: 0,
              },
      })
    },
    endTextEditing: () => set({ textEditing: null, textInputGroup: null }),
    selectTextRange: (range) => {
      const session = get().textEditing
      const layer = session && find(session.layerId)
      if (!session || !layer) return
      const safe = normalizeTextRange(layer.text, range)
      if (
        safe.start === session.range.start &&
        safe.end === session.range.end &&
        safe.backward === session.range.backward
      )
        return
      set({
        textInputGroup: null,
        textEditing: {
          ...session,
          range: safe,
          pendingStyle: null,
          target: safe.start !== safe.end ? 'selection' : session.target,
        },
      })
    },
    setTextFormatTarget: (target) => {
      const session = get().textEditing
      if (session) set({ textEditing: { ...session, target }, textInputGroup: null })
    },
    updateTextContent: (layerId, content, range, kind = 'typing') => {
      const layer = find(layerId)
      if (!layer || layer.locked) return
      const normalized = {
        text: content.text,
        inlineStyles: normalizeInlineStyles(content.text, content.inlineStyles),
      }
      if (
        layer.text === normalized.text &&
        JSON.stringify(layer.inlineStyles ?? []) === JSON.stringify(normalized.inlineStyles)
      )
        return
      const now = Date.now(),
        group = get().textInputGroup
      if (kind !== 'typing' || !group || group.layerId !== layerId || now - group.time > 800)
        get().recordHistory()
      get().updateLayer(layerId, normalized)
      const session = get().textEditing
      set({
        textInputGroup: kind === 'typing' ? { layerId, time: now } : null,
        textEditing:
          session?.layerId === layerId
            ? { ...session, range: normalizeTextRange(content.text, range) }
            : session,
      })
    },
    formatText: (layerId, style) => {
      const layer = find(layerId)
      if (!layer || layer.locked) return
      const session = get().textEditing
      if (session?.layerId === layerId && session.target === 'selection') {
        if (session.range.start === session.range.end) {
          set({
            textInputGroup: null,
            textEditing: {
              ...session,
              pendingStyle:
                style === null
                  ? {}
                  : {
                      ...(session.pendingStyle ?? insertionStyle(layer, session.range.start)),
                      ...style,
                    },
            },
          })
          return
        }
        const content = formatTextRange(layer, session.range, style)
        if (JSON.stringify(content.inlineStyles) === JSON.stringify(layer.inlineStyles ?? []))
          return
        get().recordHistory()
        get().updateLayer(layerId, content)
      } else {
        const patch = style === null ? { inlineStyles: [] } : formatWholeText(layer, style)
        if (
          Object.entries(patch).every(
            ([key, value]) =>
              JSON.stringify(layer[key as keyof TextLayer]) === JSON.stringify(value),
          )
        )
          return
        get().recordHistory()
        get().updateLayer(layerId, patch)
      }
      set({ textInputGroup: null })
    },
  }
}
