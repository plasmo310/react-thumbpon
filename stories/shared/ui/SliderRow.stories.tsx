import type { Meta, StoryObj } from '@storybook/react-vite'
import { SliderRow } from '@/shared/ui'
import { PanelBox } from '../../helpers/frames'
import { Stateful } from '../../helpers/state'

const meta = {
  title: 'shared/ui/SliderRow',
  component: SliderRow,
  args: {
    label: '文字サイズ',
    value: 140,
    min: 8,
    max: 400,
    step: 1,
    unit: 'px',
    onChange: () => {},
  },
} satisfies Meta<typeof SliderRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <PanelBox>
      <Stateful initial={args.value}>
        {(value, onChange) => <SliderRow {...args} value={value} onChange={onChange} />}
      </Stateful>
    </PanelBox>
  ),
}

export const Degrees: Story = {
  ...Default,
  args: { label: '回転', value: 0, min: -180, max: 180, unit: '°', onChange: () => {} },
}

/** 値の欄は幅が固定なので、桁が増えても行がずれない */
export const Digits: Story = {
  render: () => (
    <PanelBox>
      <Stateful initial={0}>
        {(value, onChange) => (
          <>
            <SliderRow
              label="小さい値"
              value={value}
              min={0}
              max={9999}
              onChange={onChange}
              unit="px"
            />
            <SliderRow
              label="大きい値"
              value={9999}
              min={0}
              max={9999}
              onChange={() => {}}
              unit="px"
            />
          </>
        )}
      </Stateful>
    </PanelBox>
  ),
}
