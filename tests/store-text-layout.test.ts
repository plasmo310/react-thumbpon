import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '@/app/store'
import {
  createTextLayer,
  extractTextStyle,
  textFrameStyle,
  textStyle,
  type TextLayer,
} from '@/domain/layer'
import { createThumbnail } from '@/domain/thumbnail'
import { measureTextWidth } from '@/shared/lib/measureText'

// 実測境界だけを置き換え、入力・履歴・保存データの更新は本体で検証する。
vi.mock('@/shared/lib/measureText', () => ({ measureTextWidth: vi.fn(() => 200) }))

const current = () => useEditorStore.getState().thumbnails[0].layers[0] as TextLayer
beforeEach(() => {
  vi.mocked(measureTextWidth).mockReset().mockReturnValue(200)
  const canvas = { width: 1280, height: 720 }
  const thumbnail = { ...createThumbnail('test', null, canvas), layers: [createTextLayer(canvas)] }
  useEditorStore.setState({
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    textPresets: [],
    historyPast: [],
    historyFuture: [],
    textEditing: null,
    textInputGroup: null,
  })
})

describe('テキストの自動フィットと背景', () => {
  it('固定行高はプリセット・複製・Undoで保持し、旧プリセットでは自動に戻す', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.updateLayer(id, { fixedLineHeight: 100 })
    store.addTextPreset('固定行高', extractTextStyle(current()))
    store.updateLayer(id, { fixedLineHeight: null })
    store.applyTextPreset(useEditorStore.getState().textPresets[0].id, id)
    expect(current().fixedLineHeight).toBe(100)
    store.undo()
    expect(current().fixedLineHeight).toBeNull()
    store.redo()
    store.duplicateLayer(id)
    expect(useEditorStore.getState().thumbnails[0].layers[1]).toMatchObject({
      fixedLineHeight: 100,
    })
    const { fixedLineHeight, ...legacy } = extractTextStyle(current())
    store.addTextPreset('旧プリセット', legacy as ReturnType<typeof extractTextStyle>)
    store.applyTextPreset(useEditorStore.getState().textPresets[1].id, id)
    expect(current().fixedLineHeight).toBeNull()
  })

  it('旧レイヤーと旧プリセットの行高は自動で復元する', () => {
    const store = useEditorStore.getState()
    const { fixedLineHeight, ...legacy } = current()
    const { fixedLineHeight: presetHeight, ...legacyStyle } = extractTextStyle(current())
    store.loadProject({
      folders: [],
      thumbnails: [{ ...store.thumbnails[0], layers: [legacy as TextLayer] }],
      textPresets: [
        { id: 'legacy', name: '旧形式', style: legacyStyle as ReturnType<typeof extractTextStyle> },
      ],
    })
    expect(current().fixedLineHeight).toBeNull()
    expect(useEditorStore.getState().textPresets[0].style.fixedLineHeight).toBeNull()
  })

  it('固定行高は全体の文字サイズ変更から独立し、CSSにはpxで渡す', () => {
    const store = useEditorStore.getState(),
      id = current().id
    expect(current().fixedLineHeight).toBeNull()
    expect(textStyle(current()).lineHeight).toBe(1.3)
    store.updateLayer(id, { fixedLineHeight: 100 })
    store.formatText(id, { fontSize: 120 })
    expect(textStyle(current()).lineHeight).toBe('100px')
    expect(extractTextStyle(current()).fixedLineHeight).toBe(100)
  })

  it('角丸のモード切替は個別値を保持し、プリセットとUndoでも復元できる', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.updateLayer(id, {
      backgroundRadiusMode: 'individual',
      backgroundRadius: 10,
      backgroundRadiusTopLeft: 2,
      backgroundRadiusTopRight: 4,
      backgroundRadiusBottomLeft: 6,
      backgroundRadiusBottomRight: 8,
    })
    store.updateLayer(id, { backgroundRadiusMode: 'uniform' })
    store.updateLayer(id, { backgroundRadiusMode: 'individual' })
    expect(current()).toMatchObject({ backgroundRadiusTopLeft: 2, backgroundRadiusBottomRight: 8 })
    store.addTextPreset('四隅', extractTextStyle(current()))
    store.updateLayer(id, { backgroundRadiusMode: 'uniform', backgroundRadiusTopLeft: 15 })
    store.applyTextPreset(useEditorStore.getState().textPresets[0].id, id)
    expect(current()).toMatchObject({
      backgroundRadiusMode: 'individual',
      backgroundRadiusTopLeft: 2,
      backgroundRadiusTopRight: 4,
      backgroundRadiusBottomLeft: 6,
      backgroundRadiusBottomRight: 8,
    })
    store.undo()
    expect(current()).toMatchObject({
      backgroundRadiusMode: 'uniform',
      backgroundRadiusTopLeft: 15,
    })
  })

  it('追加時に実測幅で中央に配置し、背景なしで始まる', () => {
    useEditorStore.getState().removeLayer(current().id)
    useEditorStore.getState().addTextLayer()
    expect(current()).toMatchObject({ width: 200, x: 540, autoFit: true, backgroundEnabled: false })
  })

  it('入力と計測幅を同じ履歴で戻し、移動だけでは計測しない', () => {
    const store = useEditorStore.getState(),
      id = current().id,
      original = current()
    store.beginTextEditing(id, 'properties')
    store.updateTextContent(id, { text: '短い行\n長い行です\n' }, { start: 0, end: 0 })
    expect(current()).toMatchObject({ width: 200, x: original.x, y: original.y })
    expect(useEditorStore.getState().historyPast).toHaveLength(1)
    store.undo()
    expect(current()).toMatchObject({ width: original.width, text: original.text })
    store.redo()
    expect(current().width).toBe(200)
    vi.mocked(measureTextWidth).mockClear()
    store.updateLayer(id, { x: 10, rotation: 45 })
    expect(measureTextWidth).not.toHaveBeenCalled()
  })

  it('手動幅でオフにし、入力後も幅を保ち、再度オンにするとフィットする', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.updateLayer(id, { width: 400 })
    expect(current()).toMatchObject({ width: 400, autoFit: false })
    store.updateTextContent(id, { text: '新しい文字' }, { start: 0, end: 0 })
    expect(current().width).toBe(400)
    store.updateLayer(id, { autoFit: true })
    expect(current().width).toBe(200)
  })

  it('全体・部分書式と字間を変更すると計測し直す', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.beginTextEditing(id, 'canvas')
    store.selectTextRange({ start: 0, end: 2 })
    store.formatText(id, { fontSize: 120 })
    expect(measureTextWidth).toHaveBeenCalledWith(
      expect.objectContaining({
        inlineStyles: [{ start: 0, end: 2, style: { fontSize: 120 } }],
      }),
    )
    store.setTextFormatTarget('whole')
    store.formatText(id, { fontFamily: 'serif' })
    store.updateLayer(id, { letterSpacing: 2 })
    expect(measureTextWidth).toHaveBeenCalledTimes(3)
  })

  it('四辺の余白を適用し、背景オフでは設定を保持して余白を外す', () => {
    const store = useEditorStore.getState(),
      id = current().id
    store.updateLayer(id, {
      backgroundEnabled: true,
      paddingTop: 4,
      paddingRight: 12,
      paddingBottom: 8,
      paddingLeft: 20,
      backgroundRadius: 10,
    })
    expect(current().width).toBe(232)
    expect(textFrameStyle(current())).toMatchObject({
      padding: '4px 12px 8px 20px',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
    })
    store.updateLayer(id, { backgroundEnabled: false })
    expect(current()).toMatchObject({ width: 200, paddingLeft: 20, backgroundRadius: 10 })
    expect(textFrameStyle(current()).padding).toBeUndefined()
    expect(textStyle(current()).whiteSpace).toBe('pre')
    store.updateLayer(id, { autoFit: false })
    expect(textStyle(current()).whiteSpace).toBe('pre-wrap')
  })

  it('手動幅は左右の余白より小さくならない', () => {
    const store = useEditorStore.getState()
    store.updateLayer(current().id, {
      backgroundEnabled: true,
      paddingLeft: 20,
      paddingRight: 12,
      width: 1,
    })
    expect(current()).toMatchObject({ autoFit: false, width: 33 })
  })

  it('プリセットは背景を保存し、自動フィットを変えず、複製も設定を保持する', () => {
    const store = useEditorStore.getState(),
      id = current().id
    const style = extractTextStyle({ ...current(), backgroundEnabled: true, paddingLeft: 10 })
    expect(style).not.toHaveProperty('autoFit')
    store.addTextPreset('背景', style)
    store.updateLayer(id, { autoFit: false })
    store.applyTextPreset(useEditorStore.getState().textPresets[0].id, id)
    expect(current()).toMatchObject({ autoFit: false, backgroundEnabled: true, paddingLeft: 10 })
    store.duplicateLayer(id)
    expect(useEditorStore.getState().thumbnails[0].layers[1]).toMatchObject({
      autoFit: false,
      backgroundEnabled: true,
      paddingLeft: 10,
    })
    store.undo()
    expect(useEditorStore.getState().thumbnails[0].layers).toHaveLength(1)
  })

  it('復元とフォント読み込み後に再計測し、余分な履歴と更新を作らない', () => {
    const store = useEditorStore.getState()
    store.loadProject({ folders: [], thumbnails: store.thumbnails })
    expect(current().width).toBe(200)
    vi.mocked(measureTextWidth).mockReturnValue(250)
    store.refreshTextLayout()
    expect(current().width).toBe(250)
    expect(useEditorStore.getState().historyPast).toHaveLength(0)
    const before = useEditorStore.getState().thumbnails
    store.refreshTextLayout()
    expect(useEditorStore.getState().thumbnails).toBe(before)
  })

  it('旧レイヤーと旧プリセットは背景なし・自動フィットオフで復元する', () => {
    const {
      autoFit,
      backgroundEnabled,
      backgroundColor,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      backgroundRadius,
      ...legacy
    } = current()
    const store = useEditorStore.getState()
    const {
      backgroundEnabled: enabled,
      backgroundColor: color,
      paddingTop: top,
      paddingRight: right,
      paddingBottom: bottom,
      paddingLeft: left,
      backgroundRadius: radius,
      ...legacyStyle
    } = extractTextStyle(current())
    store.loadProject({
      folders: [],
      thumbnails: [{ ...store.thumbnails[0], layers: [legacy as TextLayer] }],
      textPresets: [
        { id: 'legacy', name: '旧形式', style: legacyStyle as ReturnType<typeof extractTextStyle> },
      ],
    })
    expect(current()).toMatchObject({
      autoFit: false,
      backgroundEnabled: false,
      width: legacy.width,
    })
    expect(measureTextWidth).not.toHaveBeenCalled()
    expect(useEditorStore.getState().textPresets[0].style.backgroundEnabled).toBe(false)
  })
})
