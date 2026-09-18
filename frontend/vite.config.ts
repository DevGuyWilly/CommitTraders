import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev server proxies API calls to the Fastify backend (npm run dev
      // in the repo root) so the frontend can be developed standalone.
      '/api': 'http://localhost:3000'
    }
  }
})
