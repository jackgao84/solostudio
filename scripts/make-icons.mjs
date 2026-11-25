/**
 * Draws the app icon in Canvas 2D (original art: mirror panels under an LED strip, a headset mic and
 * an 8-count of dots) in headless WebKit and writes public/icons/*.png. Run `npm run icons`.
 */
import { webkit } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
const ICONS = [
  { file: 'icon-180.png', size: 180, kind: 'square' },
  { file: 'icon-192.png', size: 192, kind: 'rounded' },
  { file: 'icon-512.png', size: 512, kind: 'rounded' },
  { file: 'icon-maskable-512.png', size: 512, kind: 'maskable' },
]

function render({ size, kind }) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  g.scale(size, size)
  const rr = (x, y, w, h, r) => {
    g.beginPath()
    g.moveTo(x + r, y)
    g.arcTo(x + w, y, x + w, y + h, r)
    g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r)
    g.arcTo(x, y, x + w, y, r)
    g.closePath()
  }
  if (kind === 'rounded') {
    rr(0, 0, 1, 1, 0.22)
    g.clip()
  }
  // Room
  const bg = g.createLinearGradient(0, 0, 0, 1)
  bg.addColorStop(0, '#2a2250')
  bg.addColorStop(1, '#120e24')
  g.fillStyle = bg
  g.fillRect(0, 0, 1, 1)
  // Mirror panels
  const inset = kind === 'maskable' ? 0.14 : 0.08
  const pw = (1 - inset * 2 - 0.04 * 3) / 4
  for (let i = 0; i < 4; i++) {
    const x = inset + i * (pw + 0.04)
    const m = g.createLinearGradient(x, 0.2, x + pw, 0.85)
    m.addColorStop(0, 'rgba(255,255,255,0.20)')
    m.addColorStop(0.55, 'rgba(255,255,255,0.05)')
    m.addColorStop(1, 'rgba(69,227,255,0.16)')
    rr(x, 0.2, pw, 0.62, 0.03)
    g.fillStyle = m
    g.fill()
  }
  // LED strip
  const led = g.createLinearGradient(inset, 0, 1 - inset, 0)
  led.addColorStop(0, '#ff5fae')
  led.addColorStop(0.5, '#a77bff')
  led.addColorStop(1, '#45e3ff')
  g.shadowColor = '#c08bff'
  g.shadowBlur = 0.06 * size
  rr(inset, 0.12, 1 - inset * 2, 0.035, 0.017)
  g.fillStyle = led
  g.fill()
  g.shadowBlur = 0
  // Headset mic: a band arc, an earpiece and a boom to the mic
  g.lineCap = 'round'
  g.strokeStyle = '#f8f4ff'
  g.lineWidth = 0.045
  g.beginPath()
  g.arc(0.5, 0.52, 0.2, Math.PI * 1.08, Math.PI * 1.92)
  g.stroke()
  g.fillStyle = '#f8f4ff'
  rr(0.27, 0.48, 0.08, 0.14, 0.04)
  g.fill()
  g.lineWidth = 0.025
  g.beginPath()
  g.moveTo(0.33, 0.6)
  g.quadraticCurveTo(0.36, 0.74, 0.5, 0.74)
  g.stroke()
  g.shadowColor = '#ff5fae'
  g.shadowBlur = 0.05 * size
  g.fillStyle = '#ff5fae'
  g.beginPath()
  g.arc(0.53, 0.74, 0.04, 0, Math.PI * 2)
  g.fill()
  g.shadowBlur = 0
  // An 8-count of dots on the floor
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i === 0 ? '#c6ff6b' : 'rgba(255,255,255,0.45)'
    g.beginPath()
    g.arc(0.29 + i * 0.06, 0.89, i === 0 ? 0.017 : 0.012, 0, Math.PI * 2)
    g.fill()
  }
  return c.toDataURL('image/png')
}

mkdirSync(OUT, { recursive: true })
const browser = await webkit.launch()
const page = await browser.newPage()
for (const icon of ICONS) {
  const url = await page.evaluate(render, icon)
  writeFileSync(join(OUT, icon.file), Buffer.from(url.split(',')[1], 'base64'))
  console.log('wrote', icon.file)
}
await browser.close()
