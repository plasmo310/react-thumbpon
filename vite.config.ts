import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // '/src' はプロジェクトルート起点として解決される。
    // fileURLToPath を使うと @types/node が要るので、依存を増やさずに済むこの形にしている。
    // vitest もこの設定を共有するので、テスト側に同じ指定は要らない。
    alias: { '@': '/src' },
  },
})
