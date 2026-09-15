#!/usr/bin/env node
// Generates the printed-material QR code (SVG + PNG) for the short link.
// Usage: node scripts/generate-qr.mjs https://yourdomain.com/go
import QRCode from 'qrcode'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const url = process.argv[2]

if (!url) {
  console.error('Usage: node scripts/generate-qr.mjs <short-link-url>')
  process.exit(1)
}

const outDir = path.join(__dirname, '..', 'qr-code')
mkdirSync(outDir, { recursive: true })

const svgPath = path.join(outDir, 'hultprize-uwindsor-qr.svg')
const pngPath = path.join(outDir, 'hultprize-uwindsor-qr.png')

const options = {
  errorCorrectionLevel: 'H',
  margin: 2,
  color: {
    dark: '#191919',
    light: '#FFFFFF',
  },
}

await QRCode.toFile(svgPath, url, { ...options, type: 'svg' })
await QRCode.toFile(pngPath, url, { ...options, type: 'png', width: 1200 })

console.log(`Encoded URL: ${url}`)
console.log(`SVG: ${svgPath}`)
console.log(`PNG: ${pngPath}`)
