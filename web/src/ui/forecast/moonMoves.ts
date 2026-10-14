// The Moon's moves during a day as one row per minute: sign and nakshatra boundaries meet every
// 30 degrees, and Chandrashtama begins and ends exactly at a sign change, so the events of one
// instant read as a single row ("Into Leo and Magha nakshatra") with a Chandrashtama note.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { names, t } from '@/i18n'
import { jdToLocal } from '@/engine/time'
import type { TimedEvent } from '@/engine/types'

export interface MoonMove {
  /** The local minute, "YYYY-MM-DD HH:mm": unique per row, so it serves as the React key. */
  key: string
  /** The first event's instant. */
  jd: number
  /** Civil date of the move in the zone. */
  date: string
  /** "Into Leo and Magha nakshatra", or "Chandrashtama ends" when nothing else moves then. */
  label: string
  /** A note for the label when Chandrashtama (the Moon in the 8th sign from the birth Moon) begins or ends here. */
  chandrashtama?: 'begins' | 'ends'
}

const isMoonMove = (e: TimedEvent) => e.kind === 'moon_sign' || e.kind === 'moon_nakshatra' || (e.kind === 'chandrashtama' && e.body === 'Moon')

export function moonMoves(events: readonly TimedEvent[], timeZone: string): MoonMove[] {
  const rows: (MoonMove & { signs: string[]; stars: string[] })[] = []
  for (const e of events.filter(isMoonMove).sort((a, b) => a.jd - b.jd)) {
    const local = jdToLocal(e.jd, timeZone, 'minute')
    const key = `${local.date} ${local.time}`
    let row = rows.at(-1)
    if (row?.key !== key) {
      row = { key, jd: e.jd, date: local.date, label: '', signs: [], stars: [] }
      rows.push(row)
    }
    if (e.kind === 'moon_nakshatra' && e.nakshatra) row.stars.push(t('moves.star', { name: names().nakshatra[e.nakshatra - 1] }))
    else if (e.kind === 'moon_sign' && e.sign !== undefined) row.signs.push(names().sign[e.sign])
    else if (e.kind === 'chandrashtama') {
      // "Begins" carries the 8th sign; the matching sign change normally names it too.
      const begins = e.sign !== undefined
      row.chandrashtama = begins ? 'begins' : 'ends'
      if (begins) row.signs.push(names().sign[e.sign!])
    }
  }
  return rows.map(({ signs, stars, chandrashtama, ...row }) => {
    const all = [...new Set(signs), ...stars]
    return all.length ? { ...row, label: t('moves.into', { names: all.join(t('moves.and')) }), chandrashtama } : { ...row, label: t('moon.cEnds') }
  })
}
