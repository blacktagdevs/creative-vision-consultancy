import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { BASE_PATH } from './app/base-path'

export default defineConfig({
  base: BASE_PATH,
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) },
  },
})
