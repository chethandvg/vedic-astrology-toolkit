// Dates of Julian days in the current language, for the UI: English keeps engine/time.ts
// formatJd's forms ("2 Jun 2027"), the Indian languages use Intl. Clock times stay 24-hour
// digits ("14:05") everywhere.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { formatJd, jdToLocal } from '@/engine/time'
import { intlDates } from './intl'
import { LANG_INFO } from './langs'
import { getLanguage } from './store'

const local = () => (getLanguage() === 'en' ? null : intlDates(LANG_INFO[getLanguage()].tag))

/** "2 Jun 2027". */
export function fullDate(jd: number, zone: string): string {
  const d = local()
  return d ? d.full(jdToLocal(jd, zone).date) : formatJd(jd, zone, 'date')
}

/** "2 Jun 2027, 14:05". */
export function dateTime(jd: number, zone: string): string {
  const d = local()
  if (!d) return formatJd(jd, zone)
  const p = jdToLocal(jd, zone, 'minute')
  return `${d.full(p.date)}, ${p.time}`
}

/** "Wed 2 Jun". */
export function weekdayDate(jd: number, zone: string): string {
  const d = local()
  return d ? d.short(jdToLocal(jd, zone, 'minute').date) : formatJd(jd, zone, 'weekday-date')
}
