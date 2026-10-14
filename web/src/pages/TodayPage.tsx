// Today: the day's rating and reasons, what is running right now, sunrise-based timings
// (Rahu Kalam, choghadiya, horas) for the user's current place, the Moon and the dasha.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CalendarClock, Milestone } from 'lucide-react'
import type { RouteComponentProps } from 'wouter'
import { addDays } from '@/engine/time'
import type { DashaPeriod } from '@/engine/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { useProfile } from '@/state/profiles'
import { Callout } from '@/ui/components/Callout'
import { shortPlaceName, useDayTimings, useForecast, useTimingsPlace } from '@/ui/forecast/data'
import { relativeLabel, shortDate } from '@/ui/forecast/dates'
import { DashaChip } from '@/ui/forecast/DashaChip'
import { DayTimingsPanel } from '@/ui/forecast/DayTimingsPanel'
import { EventsTimeline } from '@/ui/forecast/EventsTimeline'
import { PeriodHeader } from '@/ui/forecast/ForecastHeader'
import { ForecastDisclaimer, ForecastError, ForecastSkeleton, ProfileMissing } from '@/ui/forecast/ForecastStates'
import { MoonCard } from '@/ui/forecast/MoonCard'
import { PlaceChip } from '@/ui/forecast/PlaceChip'
import { RatingHero } from '@/ui/forecast/RatingHero'
import { ReasonList } from '@/ui/forecast/ReasonList'
import { RightNow } from '@/ui/forecast/RightNow'
import { Panel } from '@/ui/forecast/Section'
import { useForecastDate, useNowJd } from '@/ui/forecast/useForecastDate'
import { Page } from '@/ui/layout/Page'

export default function TodayPage({ params }: RouteComponentProps<{ id: string }>) {
  const { t } = useT()
  const profile = useProfile(params.id)
  const nav = useForecastDate('day', profile)
  const { data: forecast, extras, error, loading, retry } = useForecast(params.id, 'day', nav.anchor)
  const { place } = useTimingsPlace(profile)
  const nowJd = useNowJd()
  const timings = forecast?.timings
  // "Right now" belongs to today only. Before sunrise the previous Vedic day is still running,
  // so it reads that day's night choghadiya and hora (or says when today's begins).
  const showNow = timings !== undefined && nav.isCurrent
  const beforeSunrise = showNow && nowJd < timings.solarDay.sunriseJd
  const night = useDayTimings(beforeSunrise ? addDays(nav.anchor, -1) : null, profile).data
  if (!profile) return <ProfileMissing />
  const zone = place.timeZone
  const relative = relativeLabel('day', nav.anchor, nav.today)
  const dashaCard = (chain: readonly DashaPeriod[], className?: string) => <DashaChip chain={chain} timeZone={zone} profileId={profile.id} className={className} />
  return (
    <Page>
      <PeriodHeader profile={profile} horizon="day" nav={nav} loading={loading && forecast !== undefined} />
      {error ? <ForecastError error={error} onRetry={retry} /> : !forecast ? <ForecastSkeleton variant="day" /> : (
        // One grid in reading order for phones: rating, right now, timings, then the Moon, dasha
        // and events (the plain facts a beginner reads first), then the reasons. Wide screens put
        // the side cards beside the timings and the reasons below both.
        <div className={cn('grid grid-cols-1 gap-4 transition-opacity duration-200 lg:grid-cols-12 lg:gap-6', loading && 'opacity-60')}>
          <RatingHero forecast={forecast} label={relative ? t('outlook.relative', { period: relative }) : t('outlook.date', { date: shortDate(nav.anchor) })} className="lg:col-span-7" />
          {showNow ? <RightNow timings={(beforeSunrise && night) || timings} nowJd={nowJd} className="lg:col-span-5" /> : dashaCard(forecast.dasha, 'max-lg:hidden lg:col-span-5')}
          {timings ? (
            <DayTimingsPanel timings={timings} nowJd={nav.isCurrent ? nowJd : -Infinity} placeAction={<PlaceChip profile={profile} />} className="self-start lg:col-span-7" />
          ) : (
            <Panel title={t('timings.title')} icon={<CalendarClock />} action={<PlaceChip profile={profile} />} className="self-start lg:col-span-7">
              <Callout tone="warning">{t('timings.unavailable')}</Callout>
            </Panel>
          )}
          <div className="space-y-4 self-start lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:space-y-6">
            {extras?.moon && <MoonCard moon={extras.moon} chandrashtama={extras.chandrashtama} events={forecast.events} date={nav.anchor} timeZone={zone} />}
            {dashaCard(forecast.dasha, showNow ? undefined : 'lg:hidden')}
            <Panel title={t('events.title')} description={t('events.localTimes', { place: shortPlaceName(place) })} icon={<Milestone />}>
              <EventsTimeline events={forecast.events} timeZone={zone} day={nav.anchor} empty={t('events.noneToday')} />
            </Panel>
          </div>
          <ReasonList
            reasons={forecast.reasons} title={t('reasons.day')} description={t('reasons.tap')}
            columns initial={5} className="pt-4 lg:col-span-12 lg:row-start-3"
          />
        </div>
      )}
      <ForecastDisclaimer />
    </Page>
  )
}
