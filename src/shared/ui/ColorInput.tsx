import { useTranslation } from '@/shared/lib/i18n'
import { useEffect, useState } from 'react'
import styles from './styles.module.css'

/** HTML カラーコードを #RRGGBB 形式へ正規化する。 */
function normalizeHtmlColor(value: string): string | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return undefined

  const hex = match[1]
  return hex.length === 3
    ? `#${hex
        .split('')
        .map((character) => character.repeat(2))
        .join('')}`.toUpperCase()
    : `#${hex}`.toUpperCase()
}

/**
 * 色の入力。カラーピッカーと16進数の直接入力を並べる。
 *
 * @param props.value    現在の色。#RRGGBB 形式
 * @param props.onChange 色が変わったときに呼ばれる
 * @param props.mixed    選択範囲の色が混在しているか
 */
export function ColorInput({
  value,
  onChange,
  mixed = false,
}: {
  value: string
  onChange: (value: string) => void
  mixed?: boolean
}) {
  const t = useTranslation()

  const [code, setCode] = useState(mixed ? '' : value)

  useEffect(() => {
    setCode(mixed ? '' : value)
  }, [value, mixed])

  const commitCode = () => {
    const color = normalizeHtmlColor(code)
    if (color) {
      onChange(color)
      setCode(color)
      return
    }
    setCode(value)
  }

  return (
    <div className={styles.color}>
      <input
        type="color"
        className={styles.colorSwatch}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className={styles.input}
        value={code}
        placeholder={mixed ? t('混在') : undefined}
        inputMode="text"
        pattern="#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?"
        aria-label={t('HTMLカラーコード')}
        onChange={(e) => setCode(e.target.value)}
        onBlur={commitCode}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setCode(value)
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}
