import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SegmentedControl } from '@/shared/ui'

const options = [
  { label: '左', value: 'left' },
  { label: '中央', value: 'center' },
  { label: '右', value: 'right' },
] as const

const meta = {
  title: 'shared/ui/SegmentedControl',
  component: SegmentedControl,
  args: { value: 'center', onChange: () => {}, options: [...options] },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<(typeof options)[number]['value']>('center')
    return <SegmentedControl value={value} onChange={setValue} options={[...options]} />
  },
}
