import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base works for GitHub Pages (/<repo>/) and for Tauri's bundled assets.
export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: { include: ['src/**/*.test.ts'] },
})
