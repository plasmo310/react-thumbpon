import { useSyncExternalStore } from 'react'
import { translate, type Locale, type MessageKey } from '@/domain/messages'
import { loadLocale } from './storage/locale'

// 状態はアプリのストアだけが持つ。共有部品から上位層への依存を避けるため、購読口を注入する。
let localeSource = {
  getLocale: loadLocale,
  subscribe:
    (_listener: () => void): (() => void) =>
    () => {},
}

/**
 * 翻訳をアプリの言語状態へ接続する。
 * @param source Zustand の言語取得・変更通知のアダプター
 */
export function connectLocale(source: typeof localeSource) {
  localeSource = source
}

/**
 * React 外の通知・ファイル操作でも、実行時点の言語を使う。
 * @param key 日本語の原文
 * @param values 差し込む名前や件数
 */
export function t(key: MessageKey, ...values: (string | number)[]): string {
  return translate(localeSource.getLocale(), key, ...values)
}

/** 表示言語だけを購読し、編集内容やコンポーネントの状態を保って再描画する。 */
export function useTranslation() {
  const locale: Locale = useSyncExternalStore(
    (listener) => localeSource.subscribe(listener),
    () => localeSource.getLocale(),
    () => localeSource.getLocale(),
  )
  return (key: MessageKey, ...values: (string | number)[]) => translate(locale, key, ...values)
}
