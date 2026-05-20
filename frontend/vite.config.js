import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En Docker, el backend es accesible por su nombre de servicio (BACKEND_URL=http://backend:8000)
// En local, fallback a localhost
const backendTarget = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',  // necesario para que Docker exponga el puerto
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})
