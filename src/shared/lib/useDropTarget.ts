import { useState } from 'react'
import type { DragEvent } from 'react'
import { hasDragType, type DndType } from './dnd'

/**
 * ドロップを受ける領域の定型。
 * 「受け入れられる種別か調べる → preventDefault → ハイライトを点ける」の流れが
 * 素材パネル・キャンバス・フォルダで同じなので、ここにまとめている。
 *
 * @param types    受け入れる種別。ひとつでも含まれていれば受ける
 * @param onDrop   落とされたときに呼ばれる。位置が要る場合のためにイベントごと渡す
 * @param options.selfOnly ドラッグが子要素へ移っただけでハイライトを消さないようにする。
 *                         中に別のドロップ領域を持つ場合に使う
 * @returns over はハイライトすべきか、dropProps はそのまま要素に展開する
 */
export function useDropTarget(
  types: DndType[],
  onDrop: (event: DragEvent) => void,
  options: { selfOnly?: boolean } = {},
) {
  const [over, setOver] = useState(false)
  const accepts = (event: DragEvent) => hasDragType(event.dataTransfer, ...types)

  return {
    over,
    dropProps: {
      onDragOver: (event: DragEvent) => {
        if (!accepts(event)) return
        event.preventDefault()
        setOver(true)
      },
      onDragLeave: (event: DragEvent) => {
        if (options.selfOnly && event.target !== event.currentTarget) return
        setOver(false)
      },
      onDrop: (event: DragEvent) => {
        if (!accepts(event)) return
        // 受け入れる種別だと分かっているので、ブラウザに開かせない
        event.preventDefault()
        setOver(false)
        onDrop(event)
      },
    },
  }
}
