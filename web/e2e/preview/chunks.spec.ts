// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test, type Page } from '@playwright/test'

// The production build after a deploy: a tab still running the old build asks for a page chunk
// the server no longer has. The app reloads itself once to pick up the new build, and when the
// chunk is really missing it shows the error screen instead of reloading again or going blank.
// The service worker is blocked so the routed 404s reach the page.
test.use({ serviceWorkers: 'block' })

const SETTINGS_CHUNK = /\/assets\/SettingsPage-[\w-]+\.js$/

/** Answer the Settings chunk with 404 for the first `failures` requests; returns the request count. */
async function breakSettingsChunk(page: Page, failures: number) {
  const count = { requests: 0, loads: 0 }
  page.on('load', () => count.loads++)
  await page.route(SETTINGS_CHUNK, (route) => (++count.requests <= failures ? route.fulfill({ status: 404, body: 'Not found' }) : route.continue()))
  return count
}

test('reloads once to fetch a chunk that a deploy replaced', async ({ page }) => {
  const count = await breakSettingsChunk(page, 1)
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'Preferences' })).toBeVisible()
  expect(count.loads).toBe(2)
  await expect(page.getByRole('alert')).toBeHidden()
})

test('a chunk that stays missing ends in the error screen, not a reload loop', async ({ page }) => {
  const count = await breakSettingsChunk(page, Infinity)
  await page.goto('./#/settings')
  await expect(page.getByRole('alert')).toContainText('Something went wrong')
  await page.waitForTimeout(1_500)
  expect(count.loads).toBe(2)
  await expect(page.getByRole('alert')).toContainText('Something went wrong')

  // The rest of the app still works.
  await page.getByRole('link', { name: 'Go home' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Vedic sky')
})
