import { useState } from 'react'
import { notifyError } from './notify'

/**
 * 時間のかかる操作を「押せなくする → 走らせる → 失敗を知らせる → 戻す」の形で包む。
 * 同じ定型が書き出し・フォント読み込み・プロジェクト操作に散っていたのでまとめている。
 *
 * 見出しは操作ごとに違うので run に渡す。busy はひとまとまりの操作で共有され、
 * 走っている間はそのグループのボタンをまとめて押せなくできる。
 *
 * @returns busy は処理中か、run(見出し, 処理) で実行する
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false)

  /**
   * @param message 失敗したときに出す見出し
   * @param task    実際の処理
   */
  const run = async (message: string, task: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await task()
    } catch (error) {
      notifyError(message, error)
    } finally {
      setBusy(false)
    }
  }

  return { busy, run }
}
