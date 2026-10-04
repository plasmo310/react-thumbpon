import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

describe('起動時の言語復元', () => {
  it.each([
    ['en', 'en', 'Thumbnail 1'],
    ['ja', 'ja', 'サムネイル 1'],
    ['unknown', 'ja', 'サムネイル 1'],
    [null, 'ja', 'サムネイル 1'],
  ])('保存値 %s で起動し、UIと初期名の言語を揃える', async (saved, locale, name) => {
    // 保存設定を読む前の状態から、ストアと翻訳の接続順も含めて確認する。
    vi.resetModules()
    vi.stubGlobal('localStorage', { getItem: () => saved })
    const { useEditorStore } = await import('@/app/store')
    const { t } = await import('@/shared/lib/i18n')
    expect(useEditorStore.getState().locale).toBe(locale)
    expect(useEditorStore.getState().thumbnails[0].name).toBe(name)
    expect(t('削除')).toBe(locale === 'en' ? 'Delete' : '削除')
  })
})
