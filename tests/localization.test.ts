import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { englishMessages, translate, type MessageKey } from '@/domain/messages'
import { createThumbnail } from '@/domain/thumbnail'
import { createTextLayer } from '@/domain/layer'
import { loadLocale, saveLocale } from '@/shared/lib/storage/locale'
import { t } from '@/shared/lib/i18n'
import { pickDocument, useEditorStore } from '@/app/store'
import { BackgroundProperties } from '@/features/layer/components/BackgroundProperties'
import { TextProperties } from '@/features/layer/components/TextProperties'
import { WorkspaceNotice } from '@/features/project/components/WorkspaceNotice'

beforeEach(() => {
  vi.stubGlobal('window', {})
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
  const thumbnail = createThumbnail('日本語の作品')
  useEditorStore.setState({
    locale: 'ja',
    thumbnails: [thumbnail],
    currentThumbnailId: thumbnail.id,
    historyPast: [],
    historyFuture: [],
    workspaceDirty: false,
    workspaceStatus: 'none',
    missingFontLabels: [],
    missingAssetNames: [],
    selectedId: null,
    textEditing: null,
  })
})

afterEach(() => {
  useEditorStore.setState({ locale: 'ja' })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ZustandのSSRは初期スナップショットを読むため、描画中だけ現在値を渡す。
function renderCurrent(element: ReactElement) {
  const initial = useEditorStore.getInitialState()
  const saved = { ...initial }
  Object.assign(initial, useEditorStore.getState())
  try {
    return renderToStaticMarkup(element)
  } finally {
    Object.assign(initial, saved)
  }
}

describe('翻訳辞書', () => {
  it('すべての英訳が空でなく、差し込み位置が原文と一致する', () => {
    for (const [key, value] of Object.entries(englishMessages)) {
      expect(value.trim(), key).not.toBe('')
      expect(value.match(/\{\d+\}/g)?.sort() ?? [], key).toEqual(
        key.match(/\{\d+\}/g)?.sort() ?? [],
      )
      expect(translate('ja', key as MessageKey)).toBe(key)
      expect(translate('en', key as MessageKey)).toBe(value)
    }
  })
  it('名前や特殊文字を再翻訳・再置換しない', () => {
    expect(translate('en', '{0} のコピー', '素材 {1} $&')).toBe('素材 {1} $& copy')
    expect(translate('en', '{0}件', 0)).toBe('Items: 0')
  })
})

describe('表示言語の保存', () => {
  it('未設定と未知の値では日本語を使う', () => {
    expect(loadLocale()).toBe('ja')
    localStorage.setItem('thumbpon.locale', 'fr')
    expect(loadLocale()).toBe('ja')
  })
  it('言語変更を保存し、次回の初期値として読み出せる', () => {
    useEditorStore.getState().setLocale('en')
    expect(loadLocale()).toBe('en')
    expect(t('保存に失敗しました')).toBe('Failed to save')
    useEditorStore.getState().setLocale('ja')
    expect(loadLocale()).toBe('ja')
  })
  it('ストレージが使えなくても切り替えられる', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadLocale()).toBe('ja')
    expect(() => saveLocale('en')).not.toThrow()
    useEditorStore.getState().setLocale('en')
    expect(t('削除')).toBe('Delete')
  })
})

describe('編集中の言語切替', () => {
  it('既存内容・履歴・保存状態を変えず、Undoでも言語を保持する', () => {
    const store = useEditorStore.getState()
    store.recordHistory()
    const before = useEditorStore.getState()
    const document = pickDocument(before)
    store.setLocale('en')
    expect(pickDocument(useEditorStore.getState())).toEqual(document)
    expect(useEditorStore.getState().historyPast).toBe(before.historyPast)
    expect(useEditorStore.getState().workspaceDirty).toBe(false)
    expect(document).not.toHaveProperty('locale')
    store.undo()
    expect(useEditorStore.getState().locale).toBe('en')
    expect(useEditorStore.getState().thumbnails[0].name).toBe('日本語の作品')
  })
  it('新しい項目だけを選択言語で作成する', () => {
    const store = useEditorStore.getState()
    store.setLocale('en')
    store.addThumbnail()
    store.addTextLayer()
    store.addShapeLayer('rectangle')
    const thumbnail = useEditorStore.getState().thumbnails[1]
    expect(thumbnail.name).toBe('Thumbnail 2')
    expect(thumbnail.layers[0]).toMatchObject({ name: 'Text', text: 'Enter text' })
    expect(thumbnail.layers[1].name).toBe('Rectangle')
    store.setLocale('ja')
    expect(useEditorStore.getState().thumbnails[1]).toEqual(thumbnail)
    store.addShapeLayer('ellipse')
    expect(useEditorStore.getState().thumbnails[1].layers[2].name).toBe('円')
  })
  it('同じ画面で背景の選択肢とテキスト項目を再翻訳する', () => {
    const background = () => renderCurrent(createElement(BackgroundProperties))
    expect(background()).toContain('グラデーション')
    useEditorStore.getState().setLocale('en')
    expect(background()).toContain('Gradient')
    expect(background()).not.toContain('グラデーション')
    const layer = createTextLayer({ width: 100, height: 100 })
    expect(renderCurrent(createElement(TextProperties, { layer }))).toContain('Sans-serif')
    useEditorStore.getState().setLocale('ja')
    expect(background()).toContain('グラデーション')
  })
  it('不足フォント通知の名前を保持し、文章だけを翻訳する', () => {
    useEditorStore.setState({ missingFontLabels: ['日本語フォント'] })
    useEditorStore.getState().setLocale('en')
    const html = renderCurrent(createElement(WorkspaceNotice))
    expect(html).toContain('日本語フォント')
    expect(html).toContain('are missing')
    expect(html).toContain('Dismiss')
  })
})
