// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CalendarDays, CalendarRange, HeartHandshake, LayoutGrid, Orbit, Sun, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useRoute } from 'wouter'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { titleWithoutApp, usePageTitle } from '@/lib/documentTitle'
import { setActiveProfile, useActiveProfile, useProfiles, type Profile } from '@/state/profiles'
import { Button } from '@/ui/components/Button'
import { LogoMark, Wordmark } from '@/ui/components/Logo'
import { Footer } from './Footer'
import { LanguageMenu } from './LanguageMenu'
import { ProfileSwitcher } from './ProfileSwitcher'
import { SkyBackground } from './SkyBackground'
import { ThemeToggle } from './ThemeToggle'
import './shell.css'

export type ProfileView = 'today' | 'week' | 'month' | 'year' | 'chart'

/** The per-profile pages, in tab order; their routes are /p/:id/<view>; labels are messages nav.<view>. */
export const PROFILE_VIEWS: readonly { view: ProfileView; icon: LucideIcon }[] = [
  { view: 'today', icon: Sun },
  { view: 'week', icon: CalendarDays },
  { view: 'month', icon: CalendarRange },
  { view: 'year', icon: Orbit },
  { view: 'chart', icon: LayoutGrid },
]

const isView = (v: string | undefined): v is ProfileView => PROFILE_VIEWS.some((p) => p.view === v)

/** Header, desktop nav, mobile tab bar and footer around every page. */
export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useT()
  const profiles = useProfiles()
  const stored = useActiveProfile()
  const [onProfile, params] = useRoute<{ id: string; view: string }>('/p/:id/:view')
  const routeId = onProfile ? params.id : undefined
  useEffect(() => {
    if (routeId) setActiveProfile(routeId)
  }, [routeId])

  const [location] = useLocation()
  const active = profiles.find((p) => p.id === routeId) ?? stored
  const view = isView(params?.view) ? params.view : null

  return (
    <div className="flex min-h-dvh flex-col">
      <SkyBackground />
      <button
        type="button"
        onClick={() => document.getElementById('main')?.focus()}
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-full border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium shadow-lg transition-transform focus:translate-y-0"
      >
        {t('nav.skip')}
      </button>

      <header className="sticky top-0 z-40 border-b border-[var(--divider)] bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label={t('nav.home')}>
            <LogoMark className="size-9" />
            <Wordmark className="max-[359px]:hidden" />
          </Link>
          {active && <DesktopNav profile={active} view={view} matching={location === '/match'} />}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {profiles.length === 0 && (
              <Link href="/about" className="hidden h-11 items-center rounded-full px-3 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] sm:inline-flex">
                {t('nav.about')}
              </Link>
            )}
            <LanguageMenu />
            <ThemeToggle />
            {profiles.length > 0 ? (
              <ProfileSwitcher profiles={profiles} active={active} view={view ?? 'today'} />
            ) : (
              location !== '/new' && <Button asChild size="sm" className="h-11 px-4 sm:h-10">
                <Link href="/new">{t('nav.getStarted')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      {/* Clear the fixed tab bar (4rem plus the home-indicator inset on notched phones). */}
      <Footer className={active ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0' : undefined} />
      {active && <MobileTabBar profile={active} view={view} />}
      <RouteAnnouncer />
    </div>
  )
}

/**
 * Tells screen-reader users which page opened: after a route change focus stays on the link
 * that was followed, so nothing else would be read. The new page's title is spoken once it
 * has set it; a title change on the same route (a date step) is left to its own controls, and
 * the first page is read by the browser itself.
 */
function RouteAnnouncer() {
  const [location] = useLocation()
  const title = usePageTitle()
  const [message, setMessage] = useState('')
  const last = useRef({ location, title })
  useEffect(() => {
    const prev = last.current
    if (title === prev.title) return // The route changed but its page has not titled itself yet.
    last.current = { location, title }
    if (location !== prev.location) setMessage(titleWithoutApp(title))
  }, [location, title])
  return <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="route-announcer">{message}</div>
}

/** The forecast tabs, and Matching on wide screens (it is in the profile menu everywhere). */
function DesktopNav({ profile, view, matching }: { profile: Profile; view: ProfileView | null; matching: boolean }) {
  const { t } = useT()
  return (
    <div className="mx-auto hidden items-center gap-2 md:flex">
      <nav aria-label={t('nav.forecasts')}>
        <ul className="flex items-center gap-1 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] p-1">
          {PROFILE_VIEWS.map(({ view: v, icon: Icon }) => {
            const current = v === view
            return (
              <li key={v}>
                <Link
                  href={`/p/${profile.id}/${v}`}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors lg:px-4',
                    current ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                  )}
                >
                  {current && (
                    <motion.span layoutId="desktop-nav-pill" aria-hidden className="absolute inset-0 rounded-full bg-[var(--selected-bg)] ring-1 ring-[var(--accent)]/40" transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }} />
                  )}
                  <Icon aria-hidden className="relative size-4" />
                  <span className="relative">{t(`nav.${v}`)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <Link
        href="/match"
        aria-current={matching ? 'page' : undefined}
        className={cn(
          'hidden h-11 items-center gap-2 rounded-full border border-[var(--surface-border)] px-3.5 text-sm font-medium transition-colors lg:flex',
          matching ? 'bg-[var(--selected-bg)] text-[var(--accent-text)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]',
        )}
      >
        <HeartHandshake aria-hidden className="size-4" />
        {t('nav.matching')}
      </Link>
    </div>
  )
}

function MobileTabBar({ profile, view }: { profile: Profile; view: ProfileView | null }) {
  const { t } = useT()
  return (
    <nav aria-label={t('nav.forecasts')} className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[var(--divider)] bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150 md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {PROFILE_VIEWS.map(({ view: v, icon: Icon }) => {
          const current = v === view
          return (
            <li key={v}>
              <Link
                href={`/p/${profile.id}/${v}`}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors',
                  current ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                )}
              >
                {current && (
                  <motion.span layoutId="mobile-tab-pill" aria-hidden className="absolute top-2 h-8 w-14 rounded-full bg-[var(--selected-bg)]" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />
                )}
                <Icon aria-hidden className="relative size-5" strokeWidth={current ? 2.2 : 1.8} />
                <span className="relative">{t(`nav.${v}`)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
