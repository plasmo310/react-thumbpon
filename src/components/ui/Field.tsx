import type { ReactNode } from 'react'

const inputBase =
  'w-full rounded-md border border-line bg-white px-2 py-1 text-xs text-ink outline-none focus:border-accent'

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-ink-sub">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      className={inputBase}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const next = Number(e.target.value)
        if (Number.isFinite(next)) onChange(next)
      }}
    />
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      className={inputBase}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TextArea({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <textarea
      className={`${inputBase} h-16 resize-y leading-snug`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        type="color"
        className="h-7 w-9 shrink-0 cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className={inputBase}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <select
      className={`${inputBase} cursor-pointer`}
      value={value}
      onChange={(e) => {
        const raw = e.target.value
        const found = options.find((o) => String(o.value) === raw)
        if (found) onChange(found.value)
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-md border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1 text-[11px] transition ${
            value === o.value
              ? 'bg-accent-soft font-bold text-accent-hover'
              : 'bg-white text-ink-sub hover:bg-app'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <input
      type="range"
      className="flex-1 accent-accent"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

export function IconButton({
  title,
  onClick,
  active,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[13px] leading-none transition hover:bg-app ${
        active ? 'text-accent' : 'text-ink-sub'
      }`}
    >
      {children}
    </button>
  )
}
