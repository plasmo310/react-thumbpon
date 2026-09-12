import styles from './styles.module.css'

/**
 * 一覧の中で名前を打ち替える input。
 * ダブルクリックで開き、Enter か focus を外すと確定、Escape で取り消す。
 *
 * @param props.value    元の名前。空にして確定したときはこれに戻す
 * @param props.onCommit 確定した名前を受け取る
 * @param props.onCancel 取り消されたときに呼ばれる
 */
export function InlineName({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  return (
    <input
      autoFocus
      className={styles.inlineName}
      defaultValue={value}
      onBlur={(e) => onCommit(e.target.value.trim() || value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') onCancel()
      }}
      // 行全体がクリックできる一覧の中に置くので、入力を触っただけで選択が変わらないようにする
      onClick={(e) => e.stopPropagation()}
    />
  )
}
