import { useState, type ReactNode } from 'react'

/**
 * 値と onChange だけを受け取る部品を、ストーリーの中で実際に動かすための入れ物。
 * 制御された部品は状態の持ち主が居ないと触っても何も起きず、確認にならないため。
 *
 * @param props.initial  初期値
 * @param props.children 現在値と更新関数を受け取って部品を描く
 */
export function Stateful<T>({
  initial,
  children,
}: {
  initial: T
  children: (value: T, onChange: (value: T) => void) => ReactNode
}) {
  const [value, setValue] = useState(initial)
  return <>{children(value, setValue)}</>
}
