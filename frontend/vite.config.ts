import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 80,
    host: '0.0.0.0',
    allowedHosts: ['writer.kangyuetech.cn'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
