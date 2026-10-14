// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { defineConfig, devices } from '@playwright/test'

const PORT = 5180
const BASE_URL = `http://localhost:${PORT}/vedic-astrology-toolkit/`
const PREVIEW_PORT = 5195
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}/vedic-astrology-toolkit/`

// End-to-end tests run against the Vite dev server on a phone and a desktop viewport; the
// specs in e2e/preview (offline use and timings) run against the production build, since only
// it has the service worker and the real bundle sizes.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // The real engine computes in the browser; with eight browsers on an unbundled dev server a
  // cold year can take several seconds, so allow more than Playwright's defaults.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', testIgnore: 'preview/**', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', testIgnore: 'preview/**', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'preview',
      testMatch: 'preview/**/*.spec.ts',
      // After the others and one test at a time, so timings are not taken on a busy machine
      // (run it alone with --project=preview --no-deps).
      dependencies: ['mobile', 'desktop'],
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: PREVIEW_URL },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --logLevel warn && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
