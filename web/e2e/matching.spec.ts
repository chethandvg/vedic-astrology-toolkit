// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test as base } from '@playwright/test'

// Kundli matching with two seeded profiles: the charts are cast by the real engine worker and
// matched on the page. Scores are not asserted (the unit tests cover them), only the structure.

const now = '2026-10-01T00:00:00.000Z'
const GROOM = {
  id: 'e2egroom01',
  birth: { name: 'Ravi', date: '1990-07-04', time: '10:12', timeZone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, place: 'New Delhi, India' },
  createdAt: now, updatedAt: now,
}
const BRIDE = {
  id: 'e2ebride01',
  birth: { name: 'Asha', date: '1992-03-15', time: '14:30', timeZone: 'Asia/Kolkata', latitude: 19.076, longitude: 72.8777, place: 'Mumbai, India' },
  createdAt: now, updatedAt: now,
}

/** Fails a test on any console error or uncaught page error. */
const test = base.extend<{ consoleErrors: void }>({
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    await use()
    expect(errors, 'console errors').toEqual([])
  }, { auto: true }],
})

const seed = (profiles: unknown[]) => ({ profiles, activeId: (profiles[0] as { id: string } | undefined)?.id ?? null })

test('two saved profiles give a score, the koota table, the poruthams and the Manglik check', async ({ page }) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem('jyotish-daily:profiles:v1')) localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify(state))
  }, seed([GROOM, BRIDE]))
  await page.goto('./#/match')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How two charts meet')
  await expect(page.getByLabel('Groom', { exact: true })).toHaveValue(GROOM.id)
  await expect(page.getByLabel('Bride', { exact: true })).toHaveValue(BRIDE.id)

  const band = page.getByRole('heading', { level: 2, name: /^(Excellent|Good|Average|Not recommended)$/ })
  await expect(band).toBeVisible({ timeout: 45_000 })
  const dial = page.getByRole('img', { name: /^\d+(\.5)? of 36 gunas$/ })
  await expect(dial).toBeVisible()
  await expect(page.getByRole('list', { name: 'Key checks' }).getByRole('listitem')).toHaveCount(4)
  await expect(page.getByRole('list', { name: 'Ashtakoota points' }).getByRole('listitem')).toHaveCount(8)
  for (const k of ['Varna', 'Vashya', 'Tara', 'Yoni', 'Graha Maitri', 'Gana', 'Bhakoot', 'Nadi']) {
    await expect(page.getByRole('list', { name: 'Ashtakoota points' }).getByRole('heading', { name: new RegExp(`^${k}`) })).toBeVisible()
  }
  await expect(page.getByRole('list', { name: 'Ten poruthams' }).getByRole('listitem')).toHaveCount(10)
  await expect(page.getByRole('article', { name: 'Ravi, Manglik check' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Asha, Manglik check' })).toBeVisible()
  await expect(page.getByText('One traditional input, not a verdict')).toBeVisible()

  // Swapping the roles keeps both profiles and recomputes the directional tables.
  const before = await dial.getAttribute('aria-label')
  await page.getByRole('button', { name: 'Swap groom and bride' }).click()
  await expect(page.getByLabel('Groom', { exact: true })).toHaveValue(BRIDE.id)
  await expect(page.getByLabel('Bride', { exact: true })).toHaveValue(GROOM.id)
  await expect(page.getByRole('article', { name: 'Asha, Manglik check' })).toContainText('Groom')
  await expect(dial).toHaveAttribute('aria-label', /of 36 gunas$/)
  expect(before).toMatch(/of 36 gunas$/)

  // The choice is remembered across a reload.
  await page.reload()
  await expect(page.getByLabel('Groom', { exact: true })).toHaveValue(BRIDE.id)
  await expect(band).toBeVisible({ timeout: 45_000 })
})

test('with fewer than two profiles the page asks for a partner', async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify(state))
  }, seed([GROOM]))
  await page.goto('./#/match')
  await expect(page.getByRole('heading', { name: 'Add a partner to match with' })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Add a partner' }).click()
  await expect(page).toHaveURL(/#\/new$/)
})
