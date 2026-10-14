// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test } from '@playwright/test'

// A page that fails to load or render shows a recovery card inside the app's frame instead of
// blanking the app (the dev server has no 'vite:preloadError' reload; see e2e/preview/chunks).

test('a page whose code fails to load shows a recovery card and the way home', async ({ page }) => {
  await page.route(/\/src\/pages\/SettingsPage\.tsx/, (route) => route.fulfill({ status: 404, body: 'Not found' }))
  await page.goto('./#/settings')

  const card = page.getByRole('alert')
  await expect(card).toContainText('Something went wrong')
  await expect(page.getByRole('button', { name: 'Reload the page' })).toBeVisible()
  // The header stays, so the rest of the app is still reachable.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Jyotish Daily home' })).toBeVisible()

  await page.getByRole('link', { name: 'Go home' }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Vedic sky')
  await expect(card).toBeHidden()
})
