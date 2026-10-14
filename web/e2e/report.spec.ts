// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test as base, type Page } from '@playwright/test'

// The printable Kundli report for a seeded profile with a fixed clock (14 October 2026, 12:30 in
// Bengaluru). Everything is computed by the real engine worker; texts are not asserted beyond
// structure, so rule changes in the forecast engine do not break it.

const ID = 'e2ereport1'
const PROFILE = {
  id: ID,
  birth: { name: 'Asha', date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937, place: 'Bengaluru, Karnataka, India' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}
const NOW = new Date('2026-10-14T12:30:00+05:30')

const SECTIONS = [
  'Birth charts (D1 and D9)', 'Planet positions', 'Panchanga at birth', 'Vimsottari dasha', 'The year 2026', 'Transits and key dates',
  'Yogas', 'Planetary strengths',
]

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

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript((profile) => {
    if (!localStorage.getItem('jyotish-daily:profiles:v1')) {
      localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify({ profiles: [profile], activeId: profile.id }))
    }
  }, PROFILE)
})

/** Open the report and wait until the chart and the year are computed (the PDF button enables). */
async function openReport(page: Page) {
  await page.goto(`./#/p/${ID}/report`)
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled({ timeout: 45_000 })
}

test('the report shows the cover and every section for a seeded profile', async ({ page }) => {
  await openReport(page)
  await expect(page).toHaveTitle(/^Kundli report · Asha · /)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Asha')
  await expect(main.getByRole('group', { name: 'Cover' })).toContainText('UTC+05:30 at birth')
  await expect(main.getByRole('group', { name: 'The chart at a glance' })).toContainText('Lagna')

  const contents = main.getByRole('navigation', { name: 'Contents' }).getByRole('listitem')
  await expect(contents).toHaveText(SECTIONS.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))))
  for (const name of SECTIONS) await expect(main.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()

  // D1 and D9 in the chosen style (North Indian by default), then the planet table.
  await expect(main.getByRole('img', { name: /^North Indian chart, .*D1/ })).toBeVisible()
  await expect(main.getByRole('img', { name: /^North Indian chart, .*D9/ })).toBeVisible()
  await expect(main.getByRole('table', { name: 'Planetary positions in the birth chart' }).locator('tbody tr')).toHaveCount(10)

  await expect(main.getByRole('region', { name: 'Birth panchanga' })).toContainText('Nakshatra')
  await expect(main.getByRole('table', { name: 'Vimsottari mahadashas' }).locator('tbody tr')).toHaveCount(9)
  await expect(main.getByRole('table', { name: /^Antardashas of the \w+ mahadasha$/ }).locator('tr[aria-current]')).toHaveCount(1)

  await expect(main.getByRole('list', { name: 'Months of the year' }).getByRole('listitem')).toHaveCount(12)
  await expect(main.getByRole('heading', { level: 3, name: 'What shapes the year' })).toBeVisible()
  await expect(main.getByRole('heading', { level: 3, name: 'Sade Sati status' })).toBeVisible()
  await expect(main.getByRole('table', { name: /^Signs of Jupiter, Saturn, Rahu and Ketu/ })).toBeVisible()
  await expect(main.getByRole('heading', { level: 3, name: 'Key dates' })).toBeVisible()
  await expect(main.getByRole('heading', { level: 2, name: 'About this report' })).toBeVisible()
  // The yogas formed and the strengths of the seven grahas, with Shadbala against its minimum.
  await expect(main.getByRole('heading', { level: 2, name: 'Yogas', exact: true })).toBeVisible()
  await expect(main.getByRole('table', { name: 'Planetary strengths' }).locator('tbody tr')).toHaveCount(7)
  await expect(main.getByRole('table', { name: 'Planetary strengths' })).toContainText('Shadbala (rupas)')
})

test('printing shows only the report, on light paper', async ({ page }) => {
  await openReport(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('banner')).toBeHidden()
  await expect(page.getByRole('contentinfo')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeHidden()
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
  // The paper keeps the light theme's colours even though the app defaults to the dark theme.
  const paper = await page.locator('.report-sheet').first().evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(paper).toBe('rgb(255, 255, 255)')
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bodyBg).toBe('rgb(255, 255, 255)')
})
