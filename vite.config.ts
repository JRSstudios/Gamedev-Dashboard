import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Relative base works for GitHub Pages (/<repo>/) and for Tauri's bundled assets.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // three.js alone is ~670 kB; it only loads with the 3D view, so the limit is raised above it.
  build: { chunkSizeWarningLimit: 700 },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: { include: ['src/**/*.test.ts'], setupFiles: ['src/test-setup.ts'] },
})
