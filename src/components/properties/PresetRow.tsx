import { useState } from 'react'
import { IconButton, Row } from '../ui'

/**
 * プリセットの適用・保存・削除をまとめた行。
 * テキストと背景で中身は違うが操作は同じなので、一覧と操作を受け取る形にしている。
 *
 * @param props.presets  選択肢に出すプリセット
 * @param props.onApply  選んだプリセットの id を受け取る
 * @param props.onSave   入力された名前を受け取る。今の設定を保存する側で使う
 * @param props.onRemove 削除するプリセットの id を受け取る
 */
export function PresetRow({
  presets,
  onApply,
  onSave,
  onRemove,
}: {
  presets: { id: string; name: string }[]
  onApply: (id: string) => void
  onSave: (name: string) => void
  onRemove: (id: string) => void
}) {
  const [selected, setSelected] = useState('')

  return (
    <Row label="プリセット">
      <select
        className="min-w-0 flex-1 cursor-pointer rounded-md border border-line bg-white px-2 py-1 text-xs outline-none focus:border-accent"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value)
          if (e.target.value) onApply(e.target.value)
        }}
      >
        <option value="">選択…</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      <IconButton
        title="今の設定をプリセットとして保存"
        onClick={() => {
          const name = window.prompt('プリセット名')?.trim()
          if (name) onSave(name)
        }}
      >
        ＋
      </IconButton>
      {selected && (
        <IconButton
          title="このプリセットを削除"
          onClick={() => {
            onRemove(selected)
            setSelected('')
          }}
        >
          🗑
        </IconButton>
      )}
    </Row>
  )
}
