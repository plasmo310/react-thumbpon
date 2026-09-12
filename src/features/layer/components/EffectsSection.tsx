import { DEFAULT_EFFECTS, type Effects } from '@/domain/effects'
import styles from '../styles.module.css'
import { ColorInput, NumberInput, PercentRow, Row, SliderRow } from '@/shared/ui'

/**
 * エフェクト1つ分の見出し兼 ON/OFF。切っている間は中身を畳んで欄を短く保つ。
 *
 * @param props.label    エフェクトの名前
 * @param props.enabled  有効かどうか
 * @param props.onToggle チェックが変わったときに呼ばれる
 */
function EffectToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
      />
      {label}
    </label>
  )
}

/**
 * ブラー・シャドウ・光彩の設定欄。レイヤーと背景で同じものを使うので、
 * ストアには触らず値と更新関数だけを受け取る。
 *
 * @param props.effects  現在の値。古いプロジェクト由来で欠けていてもよい
 * @param props.onChange 変更のあった項目だけを渡す。呼び出し側で入れ子のまま更新する
 */
export function EffectsSection({
  effects,
  onChange,
}: {
  effects: Effects | undefined
  onChange: (patch: Partial<Effects>) => void
}) {
  const value: Effects = { ...DEFAULT_EFFECTS, ...effects }

  return (
    <>
      <div className={styles.divider} />
      <span className={styles.sectionTitle}>エフェクト</span>

      <SliderRow
        label="ブラー"
        value={value.blur}
        min={0}
        max={40}
        step={0.5}
        unit="px"
        onChange={(blur) => onChange({ blur })}
      />

      <EffectToggle
        label="シャドウ"
        enabled={value.shadowEnabled}
        onToggle={(shadowEnabled) => onChange({ shadowEnabled })}
      />
      {value.shadowEnabled && (
        <>
          <div className={styles.pair}>
            <Row label="ずらしX">
              <NumberInput value={value.shadowX} onChange={(shadowX) => onChange({ shadowX })} />
            </Row>
            <Row label="ずらしY">
              <NumberInput value={value.shadowY} onChange={(shadowY) => onChange({ shadowY })} />
            </Row>
          </div>
          <SliderRow
            label="ぼかし"
            value={value.shadowBlur}
            min={0}
            max={60}
            unit="px"
            onChange={(shadowBlur) => onChange({ shadowBlur })}
          />
          <Row label="影の色">
            <ColorInput
              value={value.shadowColor}
              onChange={(shadowColor) => onChange({ shadowColor })}
            />
          </Row>
          <PercentRow
            label="濃さ"
            value={value.shadowOpacity}
            onChange={(shadowOpacity) => onChange({ shadowOpacity })}
          />
        </>
      )}

      <EffectToggle
        label="光彩"
        enabled={value.glowEnabled}
        onToggle={(glowEnabled) => onChange({ glowEnabled })}
      />
      {value.glowEnabled && (
        <>
          <SliderRow
            label="広がり"
            value={value.glowBlur}
            min={1}
            max={60}
            unit="px"
            onChange={(glowBlur) => onChange({ glowBlur })}
          />
          <Row label="光の色">
            <ColorInput value={value.glowColor} onChange={(glowColor) => onChange({ glowColor })} />
          </Row>
          <PercentRow
            label="濃さ"
            value={value.glowOpacity}
            onChange={(glowOpacity) => onChange({ glowOpacity })}
          />
        </>
      )}
    </>
  )
}
