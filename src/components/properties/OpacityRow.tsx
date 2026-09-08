import { Row, Slider } from '../ui'

/**
 * 不透明度の行。ストアは 0..1 で持ち、画面には % で見せる。
 *
 * @param props.opacity  現在の不透明度(0..1)
 * @param props.onChange 変更後の不透明度(0..1)を受け取る
 */
export function OpacityRow({
  opacity,
  onChange,
}: {
  opacity: number
  onChange: (opacity: number) => void
}) {
  const percent = Math.round(opacity * 100)

  return (
    <Row label="不透明度">
      <Slider value={percent} min={0} max={100} onChange={(value) => onChange(value / 100)} />
      <span className="w-8 shrink-0 text-right text-[11px] text-ink-sub">{percent}%</span>
    </Row>
  )
}
