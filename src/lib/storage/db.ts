import { createStore } from 'idb-keyval'

/**
 * idb-keyval の createStore は「DBを version 1 で開いて upgrade 時に objectStore を作る」ため、
 * 同じDB名で複数回呼ぶと2つ目の objectStore が作られず NotFoundError になる。
 * そのため objectStore は1つだけにして、キーの接頭辞で用途を分ける。
 *   blob:<id>        素材画像
 *   meta:list        素材メタ一覧
 *   font:<id>        フォントファイル
 *   font:list        フォントメタ一覧
 *   project:current  作業中プロジェクト
 *   handle:workspace 接続中のワークスペースフォルダのハンドル
 */
export const kv = createStore('thumbpon-assets', 'kv')
