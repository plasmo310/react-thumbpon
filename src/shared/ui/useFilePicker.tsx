import { useRef } from 'react'
import type { ReactElement } from 'react'

/** 隠した file input を開くための口。ボタン側の onClick にそのまま渡す */
export type FilePicker = { open: () => void; element: ReactElement }

/**
 * 画面に出さない file input。ボタンから開いて使う。
 *
 * 同じファイルを続けて選び直せるよう、読み取ったあとに value を空へ戻す
 * （戻さないと2回目の change が起きない）。
 *
 * @param accept   受け入れる形式。input の accept にそのまま渡す
 * @param multiple 複数選択を許すか
 * @param onFiles  選ばれたファイルを受け取る。キャンセル時は呼ばれない
 */
export function useFilePicker(
  accept: string,
  onFiles: (files: FileList) => void,
  multiple = false,
): FilePicker {
  const ref = useRef<HTMLInputElement>(null)

  const element = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={multiple}
      hidden
      onChange={(event) => {
        const { files } = event.target
        if (files && files.length > 0) onFiles(files)
        event.target.value = ''
      }}
    />
  )

  return { open: () => ref.current?.click(), element }
}
