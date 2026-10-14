// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { expect, test, type Page } from '@playwright/test'

// The interface languages: switching from the header menu changes the chrome, the forecast text
// and <html lang>, survives a reload, and "Automatic" follows the browser's language. With
// I18N_SHOTS=<dir> the Today screen is also saved in Kannada and Hindi at 390x844.

const ID = 'e2ei18n001'
const PROFILE = {
  id: ID,
  birth: { name: 'Asha', date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937, place: 'Bengaluru, Karnataka, India' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}
const NOW = new Date('2026-10-14T12:30:00+05:30')
const KANNADA = /[ಀ-೿]/
const DEVANAGARI = /[ऀ-ॿ]/

async function seed(page: Page, language?: string) {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(([profile, lang]) => {
    if (!localStorage.getItem('jyotish-daily:profiles:v1')) {
      localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify({ profiles: [profile], activeId: (profile as { id: string }).id }))
      if (lang) localStorage.setItem('jyotish-daily:settings:v1', JSON.stringify({ language: lang }))
    }
  }, [PROFILE, language] as const)
}

async function openToday(page: Page) {
  await page.goto(`./#/p/${ID}/today`)
  await expect(page.getByRole('main').getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 45_000 })
}

test('switches to Kannada from the header menu and keeps it after a reload', async ({ page }) => {
  await seed(page)
  await openToday(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByTestId('language-menu').click()
  await page.getByRole('menuitemradio', { name: /ಕನ್ನಡ/ }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'kn-IN')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ಬುಧವಾರ/)
  await expect(page.getByRole('heading', { level: 2, name: /^(ಅನುಕೂಲ|ಮಿಶ್ರ|ಕಠಿಣ)$/ })).toBeVisible()
  // The forecast text comes from the engine worker in the new language too.
  await expect(page.getByText('ದಿನವನ್ನು ರೂಪಿಸುವುದು')).toBeVisible()
  const reasons = page.getByRole('main').locator('li button')
  await expect(reasons.first()).toHaveText(KANNADA)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'kn-IN')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ಬುಧವಾರ/, { timeout: 45_000 })
})

test('Settings switches back to English', async ({ page }) => {
  await seed(page, 'hi')
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { level: 1, name: 'पसंद' })).toBeVisible()
  await page.locator('#language').selectOption('en')
  await expect(page.getByRole('heading', { level: 1, name: 'Preferences' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test.describe('automatic language', () => {
  test.use({ locale: 'ta-IN' })

  test('follows the browser language', async ({ page }) => {
    await seed(page)
    await openToday(page)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ta-IN')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/புதன்/)
  })
})

test('the About page marks the translations as AI-assisted', async ({ page }) => {
  await seed(page, 'te')
  await page.goto('./#/about')
  const note = page.getByTestId('translation-note')
  await expect(note).toContainText('AI')
  await expect(note.getByRole('link')).toHaveAttribute('href', /issues\/new/)
})

for (const [lang, script] of [['kn', KANNADA], ['hi', DEVANAGARI]] as const) {
  test(`Today in ${lang} at phone width`, async ({ page }, info) => {
    test.skip(!process.env.I18N_SHOTS || info.project.name !== 'mobile', 'screenshots only on request')
    await page.setViewportSize({ width: 390, height: 844 })
    await seed(page, lang)
    await openToday(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(script)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${process.env.I18N_SHOTS}/today-${lang}-390.png` })
    // The rest of the page, one screen at a time.
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 760, i = 1; y < height; y += 760, i++) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(150)
      await page.screenshot({ path: `${process.env.I18N_SHOTS}/today-${lang}-390-${i}.png` })
    }
    // Nothing wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
}
