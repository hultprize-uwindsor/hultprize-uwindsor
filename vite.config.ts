import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { defineConfig } from 'vite'
import photoPermissions from './src/data/photo-permissions.json' with { type: 'json' }

// Keep full-resolution source photography out of deployment artifacts.
// Approved, web-sized exports belong in a separate public/images directory.
export default defineConfig({
  resolve: { alias: { '@': resolve('src') } },
  build: { copyPublicDir: false },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-publishable-assets',
      apply: 'build',
      writeBundle(options) {
        const publicDir = resolve('public')
        const excluded = [
          ['images', 'local-event-photos-2026'].join(sep),
          ...(!photoPermissions.approvedForPublication ? [['images', 'year-one'].join(sep)] : []),
        ]
        cpSync(publicDir, resolve(options.dir ?? 'dist'), {
          recursive: true,
          filter(source) {
            const path = relative(publicDir, source)
            return !excluded.some(folder => path === folder || path.startsWith(`${folder}${sep}`))
          },
        })
      },
    },
  ],
})
