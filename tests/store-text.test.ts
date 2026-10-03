import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/app/store'
import { createTextLayer } from '@/domain/layer'
import type { TextLayer } from '@/domain/layer'
import { createThumbnail } from '@/domain/thumbnail'
import { replaceTextRange } from '@/domain/text'

const current = () => useEditorStore.getState().thumbnails[0].layers[0] as TextLayer
beforeEach(() => {
  const layer = {
    ...createTextLayer({ width: 1280, height: 720 }),
    text: 'これが最強の方法',
    fontSize: 60,
  }
  const thumbnail = { ...createThumbnail('test'), layers: [layer] }
  useEditorStore.setState({
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    textEditing: null,
    textInputGroup: null,
    selectedId: null,
    selectedIds: [],
    historyPast: [],
    historyFuture: [],
    textPresets: [],
  })
})

describe('文字編集ストア', () => {
  it('範囲選択で部分書式に切り替わり、全体指定は明示的に選べる', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.selectTextRange({ start: 3, end: 5 })
    store.formatText(id, { color: '#FF0000', fontSize: 120, strokeWidth: 4 })
    expect(current().inlineStyles?.[0]).toEqual({
      start: 3,
      end: 5,
      style: { color: '#FF0000', fontSize: 120, strokeWidth: 4 },
    })
    store.setTextFormatTarget('whole')
    store.formatText(id, { fontSize: 90, color: '#00FF00' })
    expect(current().fontSize).toBe(90)
    expect(current().inlineStyles?.[0].style).toEqual({ fontSize: 180, strokeWidth: 4 })
  })
  it('入力欄を切り替えても範囲を保持する', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.selectTextRange({ start: 3, end: 5 })
    store.beginTextEditing(id, 'properties')
    expect(useEditorStore.getState().textEditing).toMatchObject({
      surface: 'properties',
      range: { start: 3, end: 5 },
      target: 'selection',
    })
  })
  it('連続入力をまとめ、書式変更は別に戻し、カーソルも復元する', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.selectTextRange({ start: 8, end: 8 })
    store.updateTextContent(id, replaceTextRange(current(), { start: 8, end: 8 }, 'A'), {
      start: 9,
      end: 9,
    })
    store.updateTextContent(id, replaceTextRange(current(), { start: 9, end: 9 }, 'B'), {
      start: 10,
      end: 10,
    })
    expect(useEditorStore.getState().historyPast).toHaveLength(1)
    store.selectTextRange({ start: 3, end: 5 })
    store.formatText(id, { color: 'red' })
    expect(useEditorStore.getState().historyPast).toHaveLength(2)
    store.undo()
    expect(current().text).toBe('これが最強の方法AB')
    expect(current().inlineStyles).toEqual([])
    expect(useEditorStore.getState().textEditing?.range).toEqual({ start: 3, end: 5 })
    store.undo()
    expect(current().text).toBe('これが最強の方法')
    expect(useEditorStore.getState().textEditing?.range).toEqual({ start: 8, end: 8 })
    store.redo()
    store.redo()
    expect(current().inlineStyles?.[0].style.color).toBe('red')
  })
  it('時間の空いた入力、日本語変換、貼り付けは別の履歴になる', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    const time = vi.spyOn(Date, 'now').mockReturnValue(1000)
    store.updateTextContent(id, { text: 'A' }, { start: 1, end: 1 })
    time.mockReturnValue(2000)
    store.updateTextContent(id, { text: 'AB' }, { start: 2, end: 2 })
    store.updateTextContent(id, { text: 'AB日本語' }, { start: 5, end: 5 }, 'composition')
    expect(useEditorStore.getState().historyPast).toHaveLength(3)
    time.mockRestore()
  })
  it('カーソルだけの場合は次の文字の書式を設定する', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.setTextFormatTarget('selection')
    store.formatText(id, { color: 'red' })
    expect(current().inlineStyles).toBeUndefined()
    expect(useEditorStore.getState().textEditing?.pendingStyle).toEqual({ color: 'red' })
    expect(useEditorStore.getState().historyPast).toHaveLength(0)
  })
  it('プリセットは部分書式を解除し、Undoで戻せる', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.selectTextRange({ start: 3, end: 5 })
    store.formatText(id, { color: 'red' })
    store.addTextPreset('test', { ...current(), color: 'blue' })
    store.applyTextPreset(useEditorStore.getState().textPresets[0].id, id)
    expect(current().inlineStyles).toEqual([])
    store.undo()
    expect(current().inlineStyles?.[0].style.color).toBe('red')
  })
  it('ロック、非表示、削除、サムネイル切替では編集を終了する', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.updateLayer(id, { locked: true })
    expect(useEditorStore.getState().textEditing).toBeNull()
    store.updateLayer(id, { locked: false })
    store.beginTextEditing(id, 'canvas')
    store.updateLayer(id, { visible: false })
    expect(useEditorStore.getState().textEditing).toBeNull()
    store.updateLayer(id, { visible: true })
    store.beginTextEditing(id, 'canvas')
    store.removeLayer(id)
    expect(useEditorStore.getState().textEditing).toBeNull()
    store.addTextLayer()
    store.beginTextEditing(current().id, 'canvas')
    store.addThumbnail()
    expect(useEditorStore.getState().textEditing).toBeNull()
  })
})
