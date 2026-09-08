import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { BACKGROUND_ID } from '../types'

const EDITABLE = ['INPUT', 'TEXTAREA', 'SELECT']

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return EDITABLE.includes(target.tagName) || target.isContentEditable
}

/** Delete で削除、矢印で移動（Shiftで10px） */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const { selectedId, removeLayer, nudgeLayer } = useEditorStore.getState()
      if (!selectedId || selectedId === BACKGROUND_ID) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeLayer(selectedId)
        return
      }

      const step = event.shiftKey ? 10 : 1
      const move: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      const delta = move[event.key]
      if (delta) {
        event.preventDefault()
        nudgeLayer(selectedId, delta[0], delta[1])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
