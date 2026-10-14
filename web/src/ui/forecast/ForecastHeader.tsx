// Page header of the forecast screens: whose forecast, which period, and the date controls.
// Switching between Today, Week, Month, Year and Chart is the app's own navigation (the
// header tabs on wide screens, the bottom tab bar on phones), which keeps ?date= as it goes.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import type { Horizon } from '@/engine/types'
import { t, useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { profileName, type Profile } from '@/state/profiles'
import { Spinner } from '@/ui/components/Spinner'
import { Avatar } from '@/ui/layout/ProfileSwitcher'
import { DateNavigator } from './DateNavigator'
import { dateParts, periodShortLabel, periodTitle, relativeLabel } from './dates'
import type { ForecastDate } from './useForecastDate'

const KIND = { day: 'kind.day', week: 'kind.week', month: 'kind.month', year: 'kind.year' } as const satisfies Record<Horizon, string>

export interface ForecastHeaderProps {
  profile: Profile
  /** Short label after the name, e.g. "Today" or "Birth chart". */
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Shows a small spinner while a newer result loads behind the current one. */
  loading?: boolean
  action?: ReactNode
}

export function ForecastHeader({ profile, eyebrow, title, description, loading, action }: ForecastHeaderProps) {
  const { t } = useT()
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-8">
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]">
          <Avatar profile={profile} className="size-6 text-[0.55rem]" />
          <span className="truncate font-medium text-[var(--text)]">{profileName(profile)}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0 font-semibold text-[var(--accent-text)]">{eyebrow}</span>
          {loading && <Spinner className="size-4" label={t('common.updating')} />}
        </p>
        <h1 className="mt-2 text-balance font-display text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 text-[0.95rem] text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </header>
  )
}

/** "Today, Wed 14 Oct · Asha · Jyotish Daily", "October 2026 · Asha · Jyotish Daily". */
export function periodDocumentTitle(profile: Profile, horizon: Horizon, anchor: string, today: string): string {
  const relative = relativeLabel(horizon, anchor, today)
  const label = horizon === 'month' ? periodTitle('month', anchor) : periodShortLabel(horizon, anchor)
  return pageTitle(relative ? `${relative}, ${label}` : label, profileName(profile))
}

/** Header for a dated forecast screen, with the navigator for its period; it also titles the page. */
export function PeriodHeader({ profile, horizon, nav, loading }: { profile: Profile; horizon: Horizon; nav: ForecastDate; loading?: boolean }) {
  useT()
  useDocumentTitle(periodDocumentTitle(profile, horizon, nav.anchor, nav.today))
  return (
    <ForecastHeader
      profile={profile}
      eyebrow={relativeLabel(horizon, nav.anchor, nav.today) ?? t(KIND[horizon])}
      title={periodTitle(horizon, nav.anchor, dateParts(nav.today).year)}
      loading={loading}
      action={<DateNavigator horizon={horizon} nav={nav} className="w-full sm:w-auto" />}
    />
  )
}
