import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Expone el servidor en la red de Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // CRÍTICO: Obliga a Vite a revisar cambios de archivos en Windows (WSL)
    }
  }
})
