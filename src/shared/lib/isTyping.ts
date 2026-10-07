const EDITABLE = ['INPUT', 'TEXTAREA', 'SELECT']

/**
 * 文字入力中かどうか。入力欄でのキー操作をショートカットが奪わないために使う。
 *
 * @param target キーイベントの target
 */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return EDITABLE.includes(target.tagName) || target.isContentEditable
}
