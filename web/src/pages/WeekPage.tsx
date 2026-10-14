// Week: the week's rating, its seven days at a glance (tap one to open it), the best and
// gentlest days, the reasons and the week's events.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CalendarDays, Milestone } from 'lucide-react'
import type { RouteComponentProps } from 'wouter'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { useProfile } from '@/state/profiles'
import { shortPlaceName, useForecast, useTimingsPlace } from '@/ui/forecast/data'
import { relativeLabel } from '@/ui/forecast/dates'
import { DashaChip } from '@/ui/forecast/DashaChip'
import { EventsTimeline } from '@/ui/forecast/EventsTimeline'
import { PeriodHeader } from '@/ui/forecast/ForecastHeader'
import { ForecastDisclaimer, ForecastError, ForecastSkeleton, ProfileMissing } from '@/ui/forecast/ForecastStates'
import { RatingHero } from '@/ui/forecast/RatingHero'
import { ReasonList } from '@/ui/forecast/ReasonList'
import { Panel } from '@/ui/forecast/Section'
import { useForecastDate } from '@/ui/forecast/useForecastDate'
import { DayHighlights, WeekStrip } from '@/ui/forecast/WeekStrip'
import { Page } from '@/ui/layout/Page'

export default function WeekPage({ params }: RouteComponentProps<{ id: string }>) {
  const { t } = useT()
  const profile = useProfile(params.id)
  const nav = useForecastDate('week', profile)
  const { data: forecast, error, loading, retry } = useForecast(params.id, 'week', nav.anchor)
  const { place } = useTimingsPlace(profile)
  if (!profile) return <ProfileMissing />
  const relative = relativeLabel('week', nav.anchor, nav.today)
  const parts = forecast?.parts ?? []
  // Beside the days on wide screens, after the reasons on phones.
  const dasha = (className: string) => forecast && <DashaChip chain={forecast.dasha} timeZone={place.timeZone} profileId={profile.id} className={className} />
  return (
    <Page>
      <PeriodHeader profile={profile} horizon="week" nav={nav} loading={loading && forecast !== undefined} />
      {error ? <ForecastError error={error} onRetry={retry} /> : !forecast ? <ForecastSkeleton /> : (
        <div className={cn('space-y-4 transition-opacity duration-200 lg:space-y-6', loading && 'opacity-60')}>
          {/* Phones read hero, days, highlights; wide screens put the days and the dasha beside the other two (as on Month). */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
            <RatingHero forecast={forecast} label={relative ? t('outlook.relative', { period: relative }) : t('outlook.week')} className="lg:col-span-7" />
            <div className="space-y-4 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:space-y-6">
              <Panel title={t('week.days')} description={t('week.daysText')} icon={<CalendarDays />}>
                <WeekStrip parts={parts} profileId={profile.id} today={nav.today} selected={nav.date} />
              </Panel>
              {dasha('max-lg:hidden')}
            </div>
            <DayHighlights forecast={forecast} profileId={profile.id} today={nav.today} timeZone={place.timeZone} className="lg:col-span-7" />
          </div>
          <div className="grid grid-cols-1 items-start gap-4 pt-4 lg:grid-cols-12 lg:gap-6">
            <ReasonList reasons={forecast.reasons} title={t('reasons.week')} description={t('reasons.tap')} className="lg:col-span-7" />
            <div className="space-y-4 lg:col-span-5 lg:space-y-6">
              {dasha('lg:hidden')}
              <Panel title={t('events.title')} description={t('events.localTimes', { place: shortPlaceName(place) })} icon={<Milestone />}>
                <EventsTimeline events={forecast.events} timeZone={place.timeZone} grouped initial={10} />
              </Panel>
            </div>
          </div>
        </div>
      )}
      <ForecastDisclaimer />
    </Page>
  )
}
