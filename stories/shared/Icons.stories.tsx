import type { Meta, StoryObj } from '@storybook/react-vite'
import { EyeIcon, EyeOffIcon } from '@/shared/ui'

/** 依存を増やさないために自前で持っている線画アイコン。色は親の文字色に追従する */
const meta = {
  title: 'shared/ui/Icons',
  component: EyeIcon,
} satisfies Meta<typeof EyeIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Eye: Story = {}

export const EyeOff: Story = { render: () => <EyeOffIcon /> }

/** currentColor で描いているので、親の色を変えると付いてくる */
export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <span style={{ color: 'var(--color-ink)' }}>
        <EyeIcon />
      </span>
      <span style={{ color: 'var(--color-ink-sub)' }}>
        <EyeOffIcon />
      </span>
      <span style={{ color: 'var(--color-accent)' }}>
        <EyeIcon />
      </span>
    </div>
  ),
}
