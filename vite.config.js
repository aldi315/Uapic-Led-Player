import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'

// `npm run dev` → Vite dev server + Electron (main process runs from electron/
// sources directly; vite-plugin-electron restarts it on change and sets
// VITE_DEV_SERVER_URL so the windows load from the dev server).
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.js',
        vite: { build: { outDir: 'dist-electron' } },
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: { build: { outDir: 'dist-electron' } },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './',
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        control: resolve(__dirname, 'control.html'),
        player: resolve(__dirname, 'player.html'),
      },
    },
    emptyOutDir: true,
  },
})
