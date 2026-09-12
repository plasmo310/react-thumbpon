import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/shared/ui'

const meta = {
  title: 'shared/ui/Button',
  component: Button,
  args: { children: '保存', onClick: () => {} },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** パネル内の標準サイズ */
export const Small: Story = { args: { size: 'sm' } }

/** ヘッダーに置く少し大きいもの */
export const Medium: Story = { args: { size: 'md', children: 'プロジェクト' } }

export const Disabled: Story = { args: { disabled: true, children: '書き出し中…' } }

/** grow は横幅を余りいっぱいまで広げる。並べたときの見え方を確かめる */
export const Grow: Story = {
  args: { grow: true, children: '幅いっぱい' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, width: 276 }}>
      <Button {...args} />
      <Button onClick={() => {}}>隣</Button>
    </div>
  ),
}
