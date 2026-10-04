import { useEffect } from 'react'
import { useEditorStore } from '@/app/store'

/** 複数サーフェスでも、文字編集の終了判定はCanvas全体で1つにする。 */
export function useFinishTextEditing() {
  useEffect(() => {
    const finishOutside = (event: PointerEvent) => {
      const session = useEditorStore.getState().textEditing
      if (!session || !(event.target instanceof Element)) return
      const owner = event.target.closest('[data-text-layer], [data-text-properties]')
      if (
        owner?.getAttribute('data-text-layer') === session.layerId ||
        owner?.getAttribute('data-text-properties') === session.layerId
      )
        return
      // ポインタによるフォーカス移動でIMEが確定してから編集を終了する。
      window.setTimeout(() => {
        if (useEditorStore.getState().textEditing?.layerId === session.layerId)
          useEditorStore.getState().endTextEditing()
      }, 0)
    }
    document.addEventListener('pointerdown', finishOutside, true)
    return () => document.removeEventListener('pointerdown', finishOutside, true)
  }, [])
}
