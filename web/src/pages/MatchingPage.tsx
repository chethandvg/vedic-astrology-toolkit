// Kundli matching: pick two saved profiles, then the 36-point Ashtakoota score with its koota
// table and dosha notes, the ten South Indian poruthams and the Manglik check for each partner.
// The match is computed in the engine worker (ui/matching/useMatch, engineApi.match).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Flame, HeartHandshake, Info, ListChecks, ScrollText, UserPlus, Users } from 'lucide-react'
import { Link } from 'wouter'
import { T } from '@/content/active'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { profileName, useProfiles } from '@/state/profiles'
import { Button } from '@/ui/components/Button'
import { Disclosure } from '@/ui/components/Disclosure'
import { EmptyState } from '@/ui/components/EmptyState'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { Skeleton, Spinner } from '@/ui/components/Spinner'
import { ForecastDisclaimer, ForecastError } from '@/ui/forecast/ForecastStates'
import { Panel } from '@/ui/forecast/Section'
import { Page } from '@/ui/layout/Page'
import { KootaTable } from '@/ui/matching/KootaTable'
import { ManglikCards } from '@/ui/matching/ManglikCards'
import { MatchHero } from '@/ui/matching/MatchHero'
import { PairPicker } from '@/ui/matching/PairPicker'
import { PoruthamGrid } from '@/ui/matching/PoruthamGrid'
import { useMatch, useMatchPair } from '@/ui/matching/useMatch'

export default function MatchingPage() {
  const { t } = useT()
  useDocumentTitle(pageTitle(t('menu.matching')))
  const profiles = useProfiles()
  const [{ groom, bride }, setPair] = useMatchPair(profiles)
  const { data, error, loading, retry } = useMatch(groom, bride)
  const groomName = groom ? profileName(groom) : t('match.groom')
  const brideName = bride ? profileName(bride) : t('match.bride')

  return (
    <Page>
      <SectionHeader
        level={1}
        eyebrow={t('menu.matching')}
        title={t('match.title')}
        description={t('match.description')}
      />
      {profiles.length < 2 ? (
        <EmptyState
          className="mt-8"
          icon={Users}
          title={profiles.length ? t('match.addPartnerTitle') : t('match.addTwoTitle')}
          description={t('match.emptyText')}
          action={
            <Button asChild>
              <Link href="/new"><UserPlus aria-hidden /> {t('match.addPartner')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 space-y-4 lg:space-y-6">
          <Panel title={t('match.who')} icon={<Users />}>
            <PairPicker profiles={profiles} groom={groom} bride={bride} onChange={setPair} />
          </Panel>
          {error ? (
            <ForecastError error={error} onRetry={retry} />
          ) : !data ? (
            <MatchSkeleton />
          ) : (
            <div className={cn('space-y-4 transition-opacity lg:space-y-6', loading && 'opacity-60')} aria-busy={loading}>
              <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
                <MatchHero result={data.result} groomName={groomName} brideName={brideName} className="lg:col-span-7" />
                <aside className="glass flex gap-3 rounded-[var(--radius-card)] p-5 text-sm leading-relaxed sm:p-6 lg:col-span-5 lg:items-center">
                  <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--accent-text)]" />
                  <div>
                    <p className="font-semibold text-[var(--text)]">{t('match.notVerdict')}</p>
                    <p className="mt-1 text-[var(--text-muted)]">{T.MATCH_DISCLAIMER}</p>
                    {loading && <p className="mt-2 flex items-center gap-2 text-[var(--text-muted)]"><Spinner className="size-4" label={t('match.updating')} /> <span aria-hidden>{t('common.updating')}…</span></p>}
                  </div>
                </aside>
              </div>
              <Panel title={t('match.ashtakoota')} description={t('match.ashtakootaText')} icon={<HeartHandshake />}>
                <KootaTable ashtakoota={data.result.ashtakoota} groomName={groomName} brideName={brideName} />
              </Panel>
              <Panel title={t('match.poruthams')} description={t('match.poruthamsText')} icon={<ListChecks />}>
                <PoruthamGrid porutham={data.result.porutham} />
              </Panel>
              <Panel title={t('match.manglik')} description={t('match.manglikText')} icon={<Flame />}>
                <ManglikCards manglik={data.result.manglik} groomName={groomName} brideName={brideName} />
              </Panel>
              <Panel title={t('disclaimer.how')} icon={<ScrollText />}>
                <Disclosure title={t('landing.methods')}>
                  <ul className="list-disc space-y-1.5 pb-1 pl-5 text-sm leading-relaxed text-[var(--text-muted)]">
                    {T.MATCH_METHOD.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </Disclosure>
              </Panel>
            </div>
          )}
        </div>
      )}
      <ForecastDisclaimer />
    </Page>
  )
}

function MatchSkeleton() {
  const { t } = useT()
  return (
    <div role="status" aria-label={t('match.loading')} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="glass flex items-center gap-6 rounded-[var(--radius-card)] p-6 lg:col-span-7">
          <Skeleton className="size-28 shrink-0 rounded-full sm:size-36" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
        </div>
        <div className="glass rounded-[var(--radius-card)] p-6 lg:col-span-5"><Skeleton className="h-24 w-full" /></div>
      </div>
      <div className="glass rounded-[var(--radius-card)] p-6"><Skeleton className="h-5 w-32" /><Skeleton className="mt-4 h-72 w-full" /></div>
    </div>
  )
}
