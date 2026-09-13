import type { Meta, StoryObj } from '@storybook/react-vite'
import { EyeIcon, EyeOffIcon, IconButton } from '@/shared/ui'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/IconButton',
  component: IconButton,
  args: { title: 'サムネイルを追加', onClick: () => {}, children: '＋' },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** active はトグルが入っている状態。押して切り替わるところまで見る */
export const Toggle: Story = {
  render: () => (
    <Stateful initial={true}>
      {(on, setOn) => (
        <IconButton title="表示/非表示" active={on} onClick={() => setOn(!on)}>
          {on ? <EyeIcon /> : <EyeOffIcon />}
        </IconButton>
      )}
    </Stateful>
  ),
}

/** 一覧の行に並ぶときの見え方 */
export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 4 }}>
      <IconButton title="複製" onClick={() => {}}>
        ⧉
      </IconButton>
      <IconButton title="コピー" onClick={() => {}}>
        📋
      </IconButton>
      <IconButton title="削除" onClick={() => {}}>
        🗑
      </IconButton>
    </div>
  ),
}
