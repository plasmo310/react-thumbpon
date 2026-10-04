import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

describe('起動時の言語復元', () => {
  it.each([
    ['', 'en', 'en', 'Thumbnail 1'],
    ['', 'ja', 'ja', 'サムネイル 1'],
    ['', 'unknown', 'ja', 'サムネイル 1'],
    ['', null, 'ja', 'サムネイル 1'],
    ['?lang=en', 'ja', 'en', 'Thumbnail 1'],
    ['?lang=ja', 'en', 'ja', 'サムネイル 1'],
    ['?source=website&lang=en', null, 'en', 'Thumbnail 1'],
    ['?lang=fr', 'en', 'en', 'Thumbnail 1'],
    ['?lang=', 'en', 'en', 'Thumbnail 1'],
    ['?lang=EN', 'ja', 'ja', 'サムネイル 1'],
  ])(
    'URL %s・保存値 %s で起動し、UIと初期名の言語を揃える',
    async (search, saved, locale, name) => {
      // 保存設定を読む前の状態から、ストアと翻訳の接続順も含めて確認する。
      vi.resetModules()
      vi.stubGlobal('location', { search })
      const values = new Map<string, string>()
      if (saved !== null) values.set('thumbpon.locale', saved)
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      })
      const { useEditorStore } = await import('@/app/store')
      const { t } = await import('@/shared/lib/i18n')
      expect(useEditorStore.getState().locale).toBe(locale)
      expect(useEditorStore.getState().thumbnails[0].name).toBe(name)
      expect(t('削除')).toBe(locale === 'en' ? 'Delete' : '削除')
      const requested = new URLSearchParams(search).get('lang')
      expect(values.get('thumbpon.locale') ?? null).toBe(
        requested === 'ja' || requested === 'en' ? requested : saved,
      )
      // 遷移元のURL指定を失った次回起動でも、保存された言語が使われる。
      vi.stubGlobal('location', { search: '' })
      const { loadLocale } = await import('@/shared/lib/storage/locale')
      expect(loadLocale()).toBe(locale)
    },
  )

  it('保存が禁止されていてもURL指定で英語を開ける', async () => {
    vi.resetModules()
    vi.stubGlobal('location', { search: '?lang=en' })
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const { useEditorStore } = await import('@/app/store')
    expect(useEditorStore.getState().locale).toBe('en')
    expect(useEditorStore.getState().thumbnails[0].name).toBe('Thumbnail 1')
  })

  it('URL指定で起動した後も、画面から別の言語へ切り替えて保存できる', async () => {
    vi.resetModules()
    vi.stubGlobal('location', { search: '?lang=en' })
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    const { useEditorStore } = await import('@/app/store')
    const { t } = await import('@/shared/lib/i18n')
    useEditorStore.getState().setLocale('ja')
    expect(t('削除')).toBe('削除')
    expect(values.get('thumbpon.locale')).toBe('ja')
    vi.stubGlobal('location', { search: '' })
    const { loadLocale } = await import('@/shared/lib/storage/locale')
    expect(loadLocale()).toBe('ja')
  })
})
