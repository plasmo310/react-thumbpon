import { useEffect } from 'react'
import { notifyError } from '@/shared/lib/notify'
import { canUseFileSystemAccess } from '@/shared/lib/storage/fsAccess'
import { useEditorStore } from '@/app/store'
import { BACKGROUND_ID } from '@/domain/background'
import { confirmFolderOverwrite, saveProjectFolder } from '@/features/project'

const EDITABLE = ['INPUT', 'TEXTAREA', 'SELECT']

/**
 * 文字入力中かどうか。入力欄での Delete や矢印キーを奪わないために使う。
 *
 * @param target キーイベントの target
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return EDITABLE.includes(target.tagName) || target.isContentEditable
}

/**
 * 画面全体のキーボード操作を有効にする。
 * Ctrl/Cmd+S でワークスペースフォルダに保存、Delete / Backspace で選択中のレイヤーを削除、
 * 矢印キーで移動（Shift で10px）。
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // 保存は入力中でも効かせたいので、他の判定より先に見る。
      // 非対応ブラウザではブラウザ本来の保存を邪魔しないよう、何もしない
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 's' &&
        canUseFileSystemAccess()
      ) {
        event.preventDefault()
        void saveProjectFolder(confirmFolderOverwrite).catch((error) =>
          notifyError('保存に失敗しました', error),
        )
        return
      }

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
