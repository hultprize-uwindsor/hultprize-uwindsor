import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'
import { defineConfig, loadEnv, type Connect } from 'vite'
import { handleForms } from './server/forms.js'
import { handleAttendance } from './server/attendance.js'
import photoPermissions from './src/data/photo-permissions.json' with { type: 'json' }

// Keep full-resolution source photography out of deployment artifacts.
// Approved, web-sized exports belong in a separate public/images directory.
export default defineConfig(({ mode }) => {
  const formEnv = loadEnv(mode, process.cwd(), 'FORM_')
  const attendanceEnv = loadEnv(mode, process.cwd(), 'ATTENDANCE_')
  const formsMiddleware: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] === '/api/attendance') {
      void handleAttendance(req, res, { env: { ...process.env, ...attendanceEnv } })
      return
    }
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
        ]
        cpSync(publicDir, resolve(options.dir ?? 'dist'), {
          recursive: true,
          filter(source) {
            const path = relative(publicDir, source)
            const eventFolder = ['images', 'year-one'].join(sep)
            const boardFolder = ['images', 'board'].join(sep)
            if (!photoPermissions.approvedForPublication && path.startsWith(`${eventFolder}${sep}`)) {
              return photoPermissions.homeGalleryFiles.some(file => path === `${eventFolder}${sep}${file}`)
            }
            // Hero board copies (name-360.webp, name-720.webp) ship once the board is approved; until then they
            // follow the clearance of the export with the same name.
            if (!photoPermissions.approvedForPublication && !photoPermissions.heroBoardApproved && path.startsWith(`${boardFolder}${sep}`)) {
              return photoPermissions.homeGalleryFiles.includes(path.slice(boardFolder.length + 1).replace(/-\d+\.webp$/, '.jpg'))
            }
            return !excluded.some(folder => path === folder || path.startsWith(`${folder}${sep}`))
          },
        })
      },
    },
  ],
  }
})
