import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { defineConfig, loadEnv, type Connect } from 'vite'
import { handleForms } from './server/forms.js'
import photoPermissions from './src/data/photo-permissions.json' with { type: 'json' }

// Keep full-resolution source photography out of deployment artifacts.
// Approved, web-sized exports belong in a separate public/images directory.
export default defineConfig(({ mode }) => {
  const formEnv = loadEnv(mode, process.cwd(), 'FORM_')
  const formsMiddleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/forms') return next()
    void handleForms(req, res, { env: { ...process.env, ...formEnv } })
  }
  return {
  resolve: { alias: { '@': resolve('src') } },
  build: { copyPublicDir: false },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-forms-api',
      configureServer(server) { server.middlewares.use(formsMiddleware) },
      configurePreviewServer(server) { server.middlewares.use(formsMiddleware) },
    },
    {
      name: 'copy-publishable-assets',
      apply: 'build',
      writeBundle(options) {
        const publicDir = resolve('public')
        const excluded = [
          ['images', 'local-event-photos-2026'].join(sep),
          // The redesign self-hosts licensed Inter; retired font files are not shipped.
          ['fonts', 'ef-circular-latin.woff2'].join(sep),
          ['fonts', 'ef-circular-utilities.woff2'].join(sep),
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
  }
})
