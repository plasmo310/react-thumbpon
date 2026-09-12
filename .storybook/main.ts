import type { StorybookConfig } from '@storybook/react-vite'

/*
 * ストーリーは src の外（ルート直下の stories/）に置く。
 * tests/ と同じ扱いで、本体のディレクトリ構成（1機能＝1ディレクトリ）を汚さないため。
 *
 * Vite の設定は vite.config.ts をそのまま引き継ぐので、'@' のエイリアスはここに書かなくてよい。
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  framework: { name: '@storybook/react-vite', options: {} },
}

export default config
