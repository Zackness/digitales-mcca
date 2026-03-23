import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Evita CORS: el navegador llama a /esp32/* (misma origin) y Vite
      // reenvía server-side al ESP32.
      // Ej: POST /esp32/api/text -> POST http://IP_ESP32/api/text
      '/esp32': {
        target: process.env.VITE_ESP32_TARGET ?? 'http://192.168.1.50',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/esp32/, ''),
      },
    },
  },
})
