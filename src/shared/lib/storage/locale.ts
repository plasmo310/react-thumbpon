import type { Locale } from '@/domain/messages'

const LOCALE_KEY = 'thumbpon.locale'

/** 既存ユーザーの表示を保つため、未設定・不正値の場合は日本語にする。 */
export function loadLocale(): Locale {
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
