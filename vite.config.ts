import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 로컬 백엔드에 붙일 때는 VITE_API_BASE_URL 을 비우고 아래 프록시를 켭니다.
    // (경로는 명세 그대로 /api/... 를 씁니다.)
    // proxy: {
    //   '/api': { target: 'http://localhost:8080', changeOrigin: true },
    // },
  },
})
