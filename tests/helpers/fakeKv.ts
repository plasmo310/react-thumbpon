/**
 * idb-keyval をメモリ上の Map に置き換えたもの。IndexedDB は Node では動かないため。
 *
 * assetRepo / fontRepo / 自動保存は同じ `kv` を接頭辞で使い分けているので、
 * これを差し込むと「リロードしても残るもの」を本物のコードのまま検証できる。
 */
export const store = new Map<string, unknown>()

/** 保存されている内容をすべて消す。各テストの beforeEach で呼ぶ */
export function resetKv() {
  store.clear()
}

/** db.ts の createStore の代わり。キーの入れ物は1つしか無いので引数は使わない */
export const createStore = () => undefined

export const get = async <T>(key: string): Promise<T | undefined> => store.get(key) as T | undefined

export const set = async (key: string, value: unknown) => {
  store.set(key, value)
}

export const del = async (key: string) => {
  store.delete(key)
}
