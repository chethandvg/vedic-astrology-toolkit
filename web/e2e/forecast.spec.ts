// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { readFile } from 'node:fs/promises'
import { expect, test as base, type Page } from '@playwright/test'

// The forecast screens with a seeded profile and a fixed clock: Wednesday 14 October 2026,
// 12:30 in Bengaluru, which is inside that day's Rahu Kalam (12:06-13:35). Everything is
// computed by the real engine worker; ratings and reason texts are not asserted, only structure.

const ID = 'e2eforecst'
const PROFILE = {
  id: ID,
  birth: { name: 'Asha', date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937, place: 'Bengaluru, Karnataka, India' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}
const NOW = new Date('2026-10-14T12:30:00+05:30')

/**
 * Every test fails on a console error or an uncaught page error (a React key clash, a failed
 * render), unless it sets allowConsoleErrors because it breaks the engine on purpose.
 */
const test = base.extend<{ allowConsoleErrors: boolean; consoleErrors: void }>({
  allowConsoleErrors: [false, { option: true }],
  consoleErrors: [async ({ page, allowConsoleErrors }, use) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))
    await use()
    if (!allowConsoleErrors) expect(errors, 'console errors').toEqual([])
  }, { auto: true }],
})

const forecastNav = (page: Page) => page.locator('nav[aria-label="Forecasts"]:visible')
const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const rating = (page: Page) => page.getByRole('heading', { level: 2, name: /^(Favourable|Mixed|Challenging)$/ })

/**
 * Open a screen and wait for its first result: a cold dev server compiles page chunks and the
 * engine worker's modules on demand, and the worker then computes the period.
 */
async function open(page: Page, path: string) {
  await page.goto(`./#/p/${ID}/${path}`)
  await expect(page.getByRole('main').getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 45_000 })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript((profile) => {
    if (!localStorage.getItem('jyotish-daily:profiles:v1')) {
      localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify({ profiles: [profile], activeId: profile.id }))
    }
  }, PROFILE)
})

test('today shows the rating, what is running now, the day timings and the reasons', async ({ page, isMobile }) => {
  await open(page, 'today')
  await expect(heading(page)).toHaveText('Wednesday, 14 October')
  await expect(page.getByRole('heading', { level: 2, name: /Favourable|Mixed|Challenging/ })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Score \d+ out of 100$/ })).toBeVisible()

  const now = page.getByRole('region', { name: /Right now/ })
  await expect(now).toContainText('Rahu Kalam')
  await expect(now).toContainText('Hora')

  await expect(page.getByRole('img', { name: /^Day from sunrise at \d\d:\d\d/ })).toBeVisible()
  const windows = page.getByRole('list', { name: 'Windows of the day' })
  for (const name of ['Rahu Kalam', 'Yamaganda', 'Gulika Kalam', 'Durmuhurta']) await expect(windows).toContainText(name)

  // Phones show one half of the day at a time (the one running now), wide screens both.
  const rows = page.getByRole('tabpanel').getByRole('listitem')
  await expect(rows).toHaveCount(isMobile ? 8 : 16)
  await expect(rows.filter({ hasText: 'Now' })).toHaveCount(1)
  if (isMobile) {
    await page.getByRole('radio', { name: 'Night' }).click()
    await expect(rows).toHaveCount(8)
    await expect(rows.filter({ hasText: 'Now' })).toHaveCount(0)
  }
  await page.getByRole('tab', { name: 'Horas' }).click()
  await expect(rows).toHaveCount(isMobile ? 12 : 24)

  await expect(page.getByRole('region', { name: 'Moon today' })).toContainText('Tara bala')
  await expect(page.getByRole('region', { name: 'Running dasha' })).toContainText('Mahadasha')

  const reason = page.getByRole('region', { name: 'What shapes the day' }).getByRole('button').first()
  await expect(reason).toHaveAttribute('aria-expanded', 'false')
  await reason.click()
  await expect(reason).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Source:', { exact: false }).first()).toBeAttached()
})

test('the date navigator keeps the date in the URL, survives a reload and returns to today', async ({ page }) => {
  await open(page, 'today')
  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(heading(page)).toHaveText('Thursday, 15 October')
  await expect(page).toHaveURL(/\?date=2026-10-15#\/p\/e2eforecst\/today$/)
  // Right now belongs to today only.
  await expect(page.getByRole('region', { name: /Right now/ })).toHaveCount(0)

  await page.reload()
  await expect(heading(page)).toHaveText('Thursday, 15 October')

  // Arrow keys step while focus is in the navigator.
  await page.getByRole('button', { name: 'Previous day' }).focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(heading(page)).toHaveText('Tuesday, 13 October')

  // Back to today: the button goes away and focus stays in the navigator.
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(heading(page)).toHaveText('Wednesday, 14 October')
  await expect(page).not.toHaveURL(/date=/)
  await expect(page.getByRole('button', { name: /Pick a day/ })).toBeFocused()
})

test('the month and year pickers open on the selected choice', async ({ page }) => {
  await open(page, 'year')
  await page.getByRole('button', { name: /Pick a year/ }).click()
  await expect(page.getByRole('button', { name: '2026', pressed: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(heading(page)).toHaveText('2027')

  await open(page, 'month')
  await page.getByRole('button', { name: /Pick a month/ }).click()
  await expect(page.getByRole('button', { name: 'October 2026', exact: true })).toBeFocused()
})

test('the date picker jumps to a chosen day', async ({ page }) => {
  await open(page, 'today')
  await page.getByRole('button', { name: /Pick a day/ }).click()
  const grid = page.getByRole('grid', { name: 'October 2026', exact: true })
  await expect(grid.getByRole('button', { name: 'Wednesday, 14 October 2026' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(heading(page)).toHaveText('Wednesday, 21 October')
})

test('the week strip opens a day and the tabs keep the date', async ({ page }) => {
  await open(page, 'week')
  await expect(heading(page)).toHaveText('11 – 17 Oct')
  const days = page.getByRole('list', { name: 'Days of the week' }).getByRole('link')
  await expect(days).toHaveCount(7)
  await days.filter({ hasText: '16' }).click()
  await expect(page).toHaveURL(/\?date=2026-10-16#\/p\/e2eforecst\/today$/)
  await expect(heading(page)).toHaveText('Friday, 16 October')

  await forecastNav(page).getByRole('link', { name: 'Month' }).click()
  await expect(heading(page)).toHaveText('October 2026')
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(heading(page)).toHaveText('November 2026')
  await page.getByRole('button', { name: 'This month' }).click()
  await expect(heading(page)).toHaveText('October 2026')
})

test('the month heatmap is a keyboard grid that opens days', async ({ page }) => {
  await open(page, 'month')
  const grid = page.getByRole('grid', { name: /October 2026, rating of each day/ })
  await expect(grid.locator('button[data-date]')).toHaveCount(31)
  const today = grid.locator('button[aria-current="date"]')
  await expect(today).toHaveAttribute('aria-label', /^Wednesday, 14 October 2026, today: (Favourable|Mixed|Challenging), score \d+$/)
  await today.focus()
  await page.keyboard.press('ArrowRight')
  await expect(grid.locator('button[data-date="2026-10-15"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(heading(page)).toHaveText('Thursday, 15 October')
})

test('the year shows twelve months, the big transits, dashas and the Muntha', async ({ page }) => {
  await open(page, 'year')
  await expect(heading(page)).toHaveText('2026')
  await expect(page.getByRole('list', { name: 'Months of the year' }).getByRole('link')).toHaveCount(12)
  for (const name of ['Big transits', 'Dasha periods', 'Muntha', 'What shapes the year']) {
    await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Big transits' })).toContainText('from Moon')
  await page.getByRole('link', { name: /^March 2026/ }).click()
  await expect(heading(page)).toHaveText('March 2026')
})

test('the chart page shows the chart, planets and dashas and exports the birth file', async ({ page }) => {
  await open(page, 'chart')
  await expect(heading(page)).toHaveText('Saturday, 12 May 1990')
  await expect(page.getByRole('region', { name: 'Birth details' })).toContainText('Bengaluru, Karnataka, India')
  await expect(page.getByRole('radiogroup', { name: 'Chart style' }).or(page.getByRole('group', { name: 'Chart style' }))).toBeVisible()
  await expect(page.getByRole('region', { name: 'Vimsottari dasha timeline' })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export for astrologers (JSON)' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('asha.birth.json')
  const json = JSON.parse(await readFile(await file.path(), 'utf8'))
  expect(json).toMatchObject({ label: 'Asha', datetime: '1990-05-12T06:00:00', timezone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937 })
})

test('the timings place can be changed and is remembered', async ({ page }) => {
  await open(page, 'today')
  await page.getByRole('button', { name: /^Timings for Bengaluru/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Where are you today?' })
  await dialog.getByRole('combobox').fill('Chennai')
  await dialog.getByRole('option').first().click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: /^Timings for Chennai/ })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('jyotish-daily:place:v1') ?? 'null'))
  expect(stored).toMatchObject({ name: 'Chennai, Tamil Nadu, India', timeZone: 'Asia/Kolkata' })
  await page.reload()
  await expect(page.getByRole('button', { name: /^Timings for Chennai/ })).toBeVisible()
})

test('an unknown profile id explains itself', async ({ page }) => {
  await page.goto('./#/p/nosuchthing/today')
  await expect(page.getByRole('heading', { name: 'Profile not found' })).toBeVisible()
})

test.describe('engine failures', () => {
test.use({ allowConsoleErrors: true })

test('a crashed engine worker is replaced on the next request', async ({ page }) => {
  await open(page, 'today')
  await expect(rating(page)).toBeVisible()
  const engine = page.workers().find((w) => w.url().includes('engine.worker'))!
  const closed = new Promise((resolve) => engine.on('close', resolve))
  const replacement = page.waitForEvent('worker', (w) => w.url().includes('engine.worker'))
  // An uncaught error in the worker reaches the page as an error event, which retires the worker.
  await engine.evaluate(() => setTimeout(() => { throw new Error('Simulated engine crash') }))
  await closed
  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(heading(page)).toHaveText('Thursday, 15 October')
  await replacement
  await expect(rating(page)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Moon today' })).toContainText('Tara bala')
})

test('an engine that fails to start offers a working retry', async ({ page }) => {
  let block = true
  await page.context().route(/swisseph[^/]*\.wasm/, (route) => (block ? route.abort() : route.continue()))
  await page.goto(`./#/p/${ID}/today`)
  await expect(page.getByText('The calculation engine could not start.', { exact: false })).toBeVisible({ timeout: 20_000 })
  block = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(rating(page)).toBeVisible()
})
})

test('the Moon card lists a sign and a star change at the same minute as one row', async ({ page }) => {
  // 6 January 2026: the Moon enters Leo and Magha together (0 degrees Leo).
  await page.goto(`./?date=2026-01-06#/p/${ID}/today`)
  await expect(heading(page)).toHaveText('Tuesday, 6 January', { timeout: 45_000 })
  const moon = page.getByRole('region', { name: 'Moon today' })
  await expect(moon.getByRole('listitem').filter({ hasText: 'Into Leo and Magha nakshatra' })).toHaveCount(1)
  await expect(moon.getByRole('listitem').filter({ hasText: /^Into Leo\d/ })).toHaveCount(0)
})

test('today starts with five leading reasons and shows the rest on request', async ({ page }) => {
  await open(page, 'today')
  const reasons = page.getByRole('region', { name: 'What shapes the day' })
  const cards = reasons.getByRole('listitem')
  await expect(cards).toHaveCount(5)
  // The reasons the rating card names ("Lifted most by ...; held back by ...") are among them.
  const named = await page.getByRole('region', { name: /^(Favourable|Mixed|Challenging)$/ }).locator('p strong').allTextContents()
  expect(named.length).toBeGreaterThan(0)
  for (const title of named) await expect(cards.filter({ hasText: title })).toHaveCount(1)
  const more = reasons.getByRole('button', { name: /^Show all \d+ reasons$/ })
  const total = Number((await more.textContent())!.match(/\d+/)![0])
  expect(total).toBeGreaterThan(5)
  await more.click()
  await expect(cards).toHaveCount(total)
  await expect(reasons.getByRole('button', { name: 'Show only the top 5' })).toHaveAttribute('aria-expanded', 'true')
})

test('each screen titles the page, and a route change announces the new title', async ({ page }) => {
  await open(page, 'today')
  await expect(page).toHaveTitle('Today, Wed 14 Oct · Asha · Jyotish Daily')
  const announcer = page.getByTestId('route-announcer')
  await expect(announcer).toHaveText('')
  await forecastNav(page).getByRole('link', { name: 'Week' }).click()
  await expect(heading(page)).toHaveText('11 – 17 Oct')
  await expect(page).toHaveTitle('This week, 11 – 17 Oct · Asha · Jyotish Daily')
  await expect(announcer).toHaveText('This week, 11 – 17 Oct · Asha')
  // A date step keeps the route: the navigator says the new period itself.
  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page).toHaveTitle('Next week, 18 – 24 Oct · Asha · Jyotish Daily')
  await expect(announcer).toHaveText('This week, 11 – 17 Oct · Asha')
  await forecastNav(page).getByRole('link', { name: 'Chart' }).click()
  await expect(page).toHaveTitle('Birth chart · Asha · Jyotish Daily')
  await expect(announcer).toHaveText('Birth chart · Asha')
  await page.goto('./#/settings')
  await expect(page).toHaveTitle('Settings · Jyotish Daily')
})

test('quick steps send only the period finally shown to the engine', async ({ page }) => {
  // Count the year forecasts posted to the worker (Comlink "APPLY" messages for forecast(..., 'year', ...)).
  await page.addInitScript(() => {
    const w = window as unknown as { yearCalls: number }
    w.yearCalls = 0
    const post = Worker.prototype.postMessage as (this: Worker, ...args: unknown[]) => void
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      const m = args[0] as { type?: string; path?: string[]; argumentList?: { value?: unknown }[] } | null
      if (m?.type === 'APPLY' && m.path?.[0] === 'forecast' && m.argumentList?.[3]?.value === 'year') w.yearCalls++
      post.apply(this, args)
    }
  })
  await open(page, 'year')
  await expect(heading(page)).toHaveText('2026')
  const calls = () => page.evaluate(() => (window as unknown as { yearCalls: number }).yearCalls)
  const before = await calls()
  await page.getByRole('button', { name: 'Next year' }).focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(heading(page)).toHaveText('2031')
  await expect(page.getByRole('main').getByRole('status').filter({ hasText: 'Updating' })).toHaveCount(0)
  await expect(rating(page)).toBeVisible()
  // At least 2031 itself; at most the step already running when the keys were pressed, plus 2031.
  const sent = await calls() - before
  expect(sent).toBeGreaterThanOrEqual(1)
  expect(sent).toBeLessThanOrEqual(2)
})

test('switching profile computes nothing for the leaving profile at the new birthplace', async ({ page }) => {
  const ravi = {
    id: 'e2eravi',
    birth: { name: 'Ravi', date: '1985-03-02', time: '14:20', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006, place: 'New York, USA' },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }
  // Every forecast posted to the worker, as "birth date @ place zone".
  await page.addInitScript((second) => {
    const stored = JSON.parse(localStorage.getItem('jyotish-daily:profiles:v1')!)
    if (!stored.profiles.some((p: { id: string }) => p.id === second.id)) {
      localStorage.setItem('jyotish-daily:profiles:v1', JSON.stringify({ ...stored, profiles: [...stored.profiles, second] }))
    }
    const w = window as unknown as { forecasts: string[] }
    w.forecasts = []
    const post = Worker.prototype.postMessage as (this: Worker, ...args: unknown[]) => void
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
      const m = args[0] as { type?: string; path?: string[]; argumentList?: { value?: { date?: string; timeZone?: string } }[] } | null
      if (m?.type === 'APPLY' && m.path?.[0] === 'forecast') w.forecasts.push(`${m.argumentList?.[0]?.value?.date} @ ${m.argumentList?.[2]?.value?.timeZone}`)
      post.apply(this, args)
    }
  }, ravi)
  await open(page, 'year')
  await page.getByRole('button', { name: /Switch profile/ }).click()
  await page.getByRole('menuitem', { name: /Ravi/ }).click()
  await expect(page.getByRole('main').getByText('Ravi', { exact: true })).toBeVisible()
  await expect(rating(page)).toBeVisible()
  const sent = await page.evaluate(() => (window as unknown as { forecasts: string[] }).forecasts)
  expect(sent).toContain('1985-03-02 @ America/New_York')
  expect(sent).not.toContain('1990-05-12 @ America/New_York')
})
