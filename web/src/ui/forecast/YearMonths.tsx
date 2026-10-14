// Twelve months as bars rising above or dipping below an even line by score, coloured by
// rating; each opens its month. Also the Muntha card of the Tajaka year.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Compass } from 'lucide-react'
import { T } from '@/content/active'
import type { Forecast } from '@/engine/types'
import { useT } from '@/i18n'
import { fullDate } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/components/Badge'
import type { MunthaInfo } from './data'
import { dateParts, monthLong, monthShort } from './dates'
import { RATING_ICON, RATING_TONE, RATING_WORD, scorePercent, TONE_VARS } from './meta'
import { Panel } from './Section'
import { forecastHref, useForecastLink } from './useForecastDate'

export function YearMonths({ parts, profileId, today, className }: { parts: readonly Forecast[]; profileId: string; today: string; className?: string }) {
  const { t } = useT()
  const onClick = useForecastLink()
  // Scale to the largest swing (at least 0.3) so small differences stay visible but honest.
  const scale = Math.max(0.3, ...parts.map((p) => Math.abs(p.score)))
  const current = today.slice(0, 7)
  return (
    <div className={className}>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[calc(50%-1.25rem)] h-px bg-[var(--divider)]" />
        <ol className="grid h-44 grid-cols-12 gap-1 sm:gap-1.5" aria-label={t('year.monthsAria')}>
          {parts.map((p) => {
            const tone = TONE_VARS[RATING_TONE[p.rating]]
            const Icon = RATING_ICON[p.rating]
            const { month, year } = dateParts(p.start)
            const h = Math.max(0.06, Math.abs(p.score) / scale) * 50
            const isNow = p.start.slice(0, 7) === current
            return (
              <li key={p.start} className="min-w-0">
                <a
                  href={forecastHref(profileId, 'month', p.start)}
                  onClick={onClick(profileId, 'month', p.start)}
                  aria-label={t('year.monthAria', { month: `${monthLong(month)} ${year}${isNow ? `, ${t('rel.thisMonth')}` : ''}`, rating: RATING_WORD[p.rating], pct: scorePercent(p.score) })}
                  aria-current={isNow ? 'date' : undefined}
                  className="group relative flex h-full flex-col rounded-lg transition-colors hover:bg-[var(--hover)]"
                >
                  <span className="relative block flex-1">
                    <span
                      className={cn('absolute inset-x-[18%] transition-[height] duration-500', p.score >= 0 ? 'bottom-1/2 rounded-t-md rounded-b-sm' : 'top-1/2 rounded-b-md rounded-t-sm')}
                      style={{ height: `${h}%`, background: `linear-gradient(${p.score >= 0 ? '0deg' : '180deg'}, color-mix(in oklab, ${tone.solid} 55%, transparent), ${tone.solid})` }}
                    />
                  </span>
                  <Icon aria-hidden className="mx-auto mt-1 size-3.5 shrink-0" style={{ color: tone.fg }} />
                  <span className={cn('mt-0.5 h-5 text-center text-[0.65rem] font-semibold uppercase', isNow ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]')}>
                    <span className="sm:hidden">{[...monthShort(month)][0]}</span>
                    <span className="hidden sm:inline">{monthShort(month)}</span>
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{t('year.barsNote')}</p>
    </div>
  )
}

export function MunthaCard({ muntha, timeZone, className }: { muntha: MunthaInfo; timeZone: string; className?: string }) {
  const { t, n } = useT()
  return (
    <Panel title={t('muntha.title')} description={t('muntha.from', { date: fullDate(muntha.returnJd, timeZone) })} icon={<Compass />} className={className}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-display text-2xl font-semibold">{n.sign[muntha.sign]}</p>
        <p className="text-sm text-[var(--text-muted)]">{n.signAlt[muntha.sign]}</p>
        <Badge tone={muntha.favourable ? 'good' : 'mixed'} className="ml-auto">{muntha.favourable ? t('effect.supportive') : t('muntha.care')}</Badge>
      </div>
      <p className="mt-1 text-sm text-[var(--text)]">{t('muntha.house', { nth: n.ordinal(muntha.house), age: muntha.completedYears })}</p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{T.MUNTHA_TEXT[muntha.house - 1]}</p>
      <p className="mt-3 border-t border-[var(--divider)] pt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {t('muntha.note')}
      </p>
    </Panel>
  )
}
