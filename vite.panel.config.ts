import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer/panel',
  base: './',
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/renderer/shared') },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer/panel'),
    emptyOutDir: true,
  },
})
