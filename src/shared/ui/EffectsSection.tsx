import { DEFAULT_EFFECTS, type Effects } from '@/core/model/types'
import { ColorInput } from './ColorInput'
import { NumberInput } from './NumberInput'
import { Row } from './Row'
import { Slider } from './Slider'

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
      <div className="mt-1 border-t border-line pt-2" />
      <span className="text-[11px] font-bold text-ink-sub">エフェクト</span>

      <Row label="ブラー">
        <Slider
          value={value.blur}
          min={0}
          max={40}
          step={0.5}
          onChange={(blur) => onChange({ blur })}
        />
        <span className="w-10 shrink-0 text-right text-[11px] text-ink-sub">{value.blur}px</span>
      </Row>

      <EffectToggle
        label="シャドウ"
        enabled={value.shadowEnabled}
        onToggle={(shadowEnabled) => onChange({ shadowEnabled })}
      />
      {value.shadowEnabled && (
        <>
          <div className="flex gap-2">
            <Row label="ずらしX">
              <NumberInput value={value.shadowX} onChange={(shadowX) => onChange({ shadowX })} />
            </Row>
            <Row label="ずらしY">
              <NumberInput value={value.shadowY} onChange={(shadowY) => onChange({ shadowY })} />
            </Row>
          </div>
          <Row label="ぼかし">
            <Slider
              value={value.shadowBlur}
              min={0}
              max={60}
              onChange={(shadowBlur) => onChange({ shadowBlur })}
            />
            <span className="w-10 shrink-0 text-right text-[11px] text-ink-sub">
              {value.shadowBlur}px
            </span>
          </Row>
          <Row label="影の色">
            <ColorInput
              value={value.shadowColor}
              onChange={(shadowColor) => onChange({ shadowColor })}
            />
          </Row>
          <Row label="濃さ">
            <Slider
              value={Math.round(value.shadowOpacity * 100)}
              min={0}
              max={100}
              onChange={(percent) => onChange({ shadowOpacity: percent / 100 })}
            />
            <span className="w-10 shrink-0 text-right text-[11px] text-ink-sub">
              {Math.round(value.shadowOpacity * 100)}%
            </span>
          </Row>
        </>
      )}

      <EffectToggle
        label="光彩"
        enabled={value.glowEnabled}
        onToggle={(glowEnabled) => onChange({ glowEnabled })}
      />
      {value.glowEnabled && (
        <>
          <Row label="広がり">
            <Slider
              value={value.glowBlur}
              min={1}
              max={60}
              onChange={(glowBlur) => onChange({ glowBlur })}
            />
            <span className="w-10 shrink-0 text-right text-[11px] text-ink-sub">
              {value.glowBlur}px
            </span>
          </Row>
          <Row label="光の色">
            <ColorInput value={value.glowColor} onChange={(glowColor) => onChange({ glowColor })} />
          </Row>
          <Row label="濃さ">
            <Slider
              value={Math.round(value.glowOpacity * 100)}
              min={0}
              max={100}
              onChange={(percent) => onChange({ glowOpacity: percent / 100 })}
            />
            <span className="w-10 shrink-0 text-right text-[11px] text-ink-sub">
              {Math.round(value.glowOpacity * 100)}%
            </span>
          </Row>
        </>
      )}
    </>
  )
}
