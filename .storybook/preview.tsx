import type { Preview } from '@storybook/react-vite'
// トークンとリセット。部品はすべてここの var() を前提にしているので、これが無いと素の見た目になる
import '../src/styles.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
}

export default preview
