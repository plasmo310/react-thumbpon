import { useEffect } from 'react'
import { notifyError } from '@/shared/lib/notify'
import { canUseFileSystemAccess } from '@/shared/lib/storage/fsAccess'
import { useEditorStore } from '@/app/store'
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
 * Ctrl/Cmd+S でワークスペースフォルダに保存、Ctrl/Cmd+Z で元に戻す
 * （Shiftでやり直し。Ctrl/Cmd+Y でもやり直せる）、
 * Delete / Backspace で選択中のレイヤーを削除、矢印キーで移動（Shift で10px）。
 * 選択が複数ある間はまとめて対象になる。
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

      // 入力欄では、ブラウザ標準の Undo/Redo を邪魔しないようここで止める
      if (isTyping(event.target)) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        const { undo, redo } = useEditorStore.getState()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        useEditorStore.getState().redo()
        return
      }

      const { selectedIds, removeLayers, nudgeLayer, recordHistory } = useEditorStore.getState()
      if (selectedIds.length === 0) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeLayers(selectedIds)
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
        // 何件動かしても Undo の単位はひとつにまとめる
        recordHistory()
        selectedIds.forEach((id) => nudgeLayer(id, delta[0], delta[1]))
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
