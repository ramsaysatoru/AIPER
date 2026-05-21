import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // Railway sets the PORT env var dynamically; bind to all interfaces
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 5000,
    strictPort: true,
  },
})

