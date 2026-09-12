/**
 * 失敗をユーザーに知らせる。原因は開発者向けにコンソールへも残す。
 * ブラウザ完結のツールで復旧手段が無いため、通知は alert に統一している。
 *
 * @param message 何に失敗したかを日本語で。末尾に原因が改行で続く
 * @param error   catch で受け取った値。Error 以外が飛んでくる場合もあるため unknown で受ける
 */
export function notifyError(message: string, error: unknown): void {
  console.error(message, error)
  window.alert(`${message}\n${error instanceof Error ? error.message : String(error)}`)
}
