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
    // 실제 API 서버가 뜨면 VITE_API_BASE_URL 을 '/api' 로 두고 아래 프록시를 켭니다.
    // proxy: {
    //   '/api': { target: 'http://localhost:8080', changeOrigin: true },
    // },
  },
})
