import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry file
        entry: 'electron/main.ts',
        onstart(_options) {
          // Copy migrations to dist-electron
          const srcDir = path.join(__dirname, 'electron/services/database/migrations')
          const destDir = path.join(__dirname, 'dist-electron/migrations')

          if (fs.existsSync(srcDir)) {
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true })
            }

            const files = fs.readdirSync(srcDir)
            files.forEach(file => {
              if (file.endsWith('.sql')) {
                fs.copyFileSync(
                  path.join(srcDir, file),
                  path.join(destDir, file)
                )
              }
            })
          }
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', 'fluent-ffmpeg']
            }
          }
        }
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@electron': path.resolve(__dirname, './electron')
    }
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})
