/**
 * エフェクト1つ分の見出し兼 ON/OFF。切っている間は中身を畳んで欄を短く保つ。
 *
 * @param props.label    エフェクトの名前
 * @param props.enabled  有効かどうか
 * @param props.onToggle チェックが変わったときに呼ばれる
 */
export function EffectToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-sub">
      <input
        type="checkbox"
        className="accent-accent"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
      {label}
    </label>
  )
}
