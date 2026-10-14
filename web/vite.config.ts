// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Content Security Policy for production builds (GitHub Pages cannot send headers, so it is a
 * meta tag placed first in <head>). Only the app's own files may load; WebAssembly needs
 * 'wasm-unsafe-eval'; the inline theme script is allowed by its hash; dialogs inject <style>
 * tags, hence 'unsafe-inline' for styles only. Not applied in dev, where Vite injects scripts.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
        const policy = [
          "default-src 'self'",
          `script-src 'self' 'wasm-unsafe-eval' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

// Served from https://chethandvg.github.io/vedic-astrology-toolkit/
export default defineConfig({
  base: '/vedic-astrology-toolkit/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Jyotish Daily: Vedic astrology forecasts',
        short_name: 'Jyotish Daily',
        description: 'Private Vedic astrology charts and daily, weekly, monthly and yearly guidance computed on your device.',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
    contentSecurityPolicy(),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
})
