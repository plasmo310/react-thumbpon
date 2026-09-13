import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Splitter } from '@/shared/ui'

const meta = {
  title: 'shared/ui/Splitter',
  component: Splitter,
  args: { axis: 'x', size: 180, onResize: () => {}, title: 'パネル幅を変更' },
} satisfies Meta<typeof Splitter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [size, setSize] = useState(180)
    return (
      <div style={{ display: 'flex', height: 120, maxWidth: 420 }}>
        <div style={{ width: size, background: 'var(--color-panel)' }} />
        <Splitter axis="x" size={size} onResize={setSize} title="パネル幅を変更" />
        <div style={{ flex: 1, background: 'var(--color-panel)' }} />
      </div>
    )
  },
}
