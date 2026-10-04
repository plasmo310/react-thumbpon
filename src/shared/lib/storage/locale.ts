import type { Locale } from '@/domain/messages'

const LOCALE_KEY = 'thumbpon.locale'

/** URL指定を優先して保存し、指定がなければ保存設定・日本語の順に復元する。 */
export function loadLocale(): Locale {
  const requested = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get(
    'lang',
  )
  if (requested === 'ja' || requested === 'en') {
    saveLocale(requested)
    return requested
  }
  try {
    return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'ja'
  } catch {
    return 'ja'
  }
}

/**
 * 保存が禁止されていても、このセッションでの言語切替は妨げない。
 * @param locale 次回起動時に使う言語
 */
export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // プライベートブラウズなどで保存できなくても編集は続けられる。
  }
}
