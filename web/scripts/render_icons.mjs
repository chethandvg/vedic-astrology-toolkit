// Render the PNG icons and the social preview image from public/favicon.svg
// with headless Chromium (Playwright). Run from web/: node scripts/render_icons.mjs
// Writes public/pwa-192.png, pwa-512.png, apple-touch-icon.png and og-image.png.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const web = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url))
const favicon = readFileSync(web('public/favicon.svg'), 'utf8')
const font = (p) => readFileSync(web(`node_modules/@fontsource-variable/${p}`)).toString('base64')

/**
 * Full-bleed square icon: no rounded corners (platforms mask their own) and
 * the artwork shrunk to 86% so it sits inside the maskable-icon safe circle
 * (80% of the width).
 */
function squareIcon() {
  return favicon
    .replace('rx="15" ', '')
    .replace(/(<path d="M21\.5[\s\S]*)(<\/svg>)/, '<g transform="translate(32 32) scale(0.86) translate(-32 -32)">$1</g>$2')
}

/** Decorative zodiac ring for the social image: 12 signs, 27 nakshatra ticks. */
function wheel(size) {
  const c = size / 2
  const at = (r, deg) => [c + r * Math.sin((deg * Math.PI) / 180), c - r * Math.cos((deg * Math.PI) / 180)]
  const tick = (r1, r2, deg) => { const [a, b] = at(r1, deg), [x, y] = at(r2, deg); return `M${a.toFixed(1)} ${b.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}` }
  const signs = Array.from({ length: 12 }, (_, i) => tick(c * 0.84, c * 0.98, i * 30)).join('')
  const stars = Array.from({ length: 27 }, (_, i) => tick(c * 0.74, c * 0.8, (i * 360) / 27)).join('')
  const points = (k) => Array.from({ length: 9 }, (_, i) => at(c * 0.5, ((i * k) % 9) * 40).map((v) => v.toFixed(1)).join(',')).join(' ')
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" stroke="#ffd38a">
    <circle cx="${c}" cy="${c}" r="${c * 0.98}" stroke-opacity=".35"/><circle cx="${c}" cy="${c}" r="${c * 0.84}" stroke-opacity=".35"/>
    <circle cx="${c}" cy="${c}" r="${c * 0.74}" stroke-opacity=".18"/>
    <path d="${signs}" stroke-opacity=".3"/><path d="${stars}" stroke-opacity=".35"/>
    <polygon points="${points(4)}" stroke-opacity=".25"/><circle cx="${c}" cy="${c}" r="${c * 0.5}" stroke-opacity=".15"/>
  </svg>`
}

function ogHtml() {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const stars = Array.from({ length: 90 }, () =>
    `<circle cx="${(rand() * 1200).toFixed(0)}" cy="${(rand() * 630).toFixed(0)}" r="${(0.5 + rand() ** 3 * 1.6).toFixed(2)}" fill="#fff" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font('fraunces/files/fraunces-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: Fraunces; font-style: italic; src: url(data:font/woff2;base64,${font('fraunces/files/fraunces-latin-wght-italic.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${font('inter/files/inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
    html, body { margin: 0; }
    .card { position: relative; width: 1200px; height: 630px; overflow: hidden; color: #e8ecf8; font-family: Inter, sans-serif;
      background: radial-gradient(700px 480px at 6% -10%, rgb(139 124 246 / .32), transparent 62%),
                  radial-gradient(620px 420px at 100% 0%, rgb(240 165 48 / .16), transparent 60%), #0b1020; }
    .stars { position: absolute; inset: 0; }
    .wheel { position: absolute; right: -150px; top: 15px; opacity: .9; }
    .sun { position: absolute; right: 50px; top: 215px; width: 200px; height: 200px; border-radius: 50%;
      background: radial-gradient(circle, #fff3d6 0%, #f8bd57 30%, rgb(233 149 31 / .9) 42%, rgb(248 189 87 / .18) 52%, transparent 70%); }
    .content { position: absolute; left: 84px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; width: 720px; }
    .brand { display: flex; align-items: center; gap: 22px; }
    .brand svg { width: 96px; height: 96px; filter: drop-shadow(0 12px 30px rgb(0 0 0 / .45)); }
    .name { font-family: Fraunces, serif; font-weight: 600; font-size: 56px; letter-spacing: -0.02em; }
    .name span { color: #f8bd57; }
    h1 { margin: 44px 0 0; font-family: Fraunces, serif; font-weight: 600; font-size: 76px; line-height: 1.02; letter-spacing: -0.025em; }
    h1 em { font-weight: 500; background: linear-gradient(100deg, #ffe0a3, #f8bd57 45%, #c4b5fd); -webkit-background-clip: text; color: transparent; padding-right: 6px; }
    p { margin: 26px 0 0; font-size: 27px; color: #b4bdd8; }
  </style></head><body><div class="card">
    <svg class="stars" viewBox="0 0 1200 630">${stars}</svg>
    <div class="wheel">${wheel(600)}</div><div class="sun"></div>
    <div class="content">
      <div class="brand">${favicon}<div class="name">Jyotish <span>Daily</span></div></div>
      <h1>Your Vedic sky,<br><em>day by day</em></h1>
      <p>Private Vedic astrology, computed on your device</p>
    </div>
  </div></body></html>`
}

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

for (const [file, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await page.setViewportSize({ width: size, height: size })
  const svg = squareIcon().replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`)
  await page.screenshot({ path: web(`public/${file}`), clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`wrote public/${file}`)
}

await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(ogHtml())
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: web('public/og-image.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } })
console.log('wrote public/og-image.png')
await browser.close()
