// Birth chart: North or South Indian chart with divisional charts, birth details with an
// export for astrologers, the birth panchanga, planet positions, planetary strength (Shadbala,
// Vimsopaka, functional nature), the yogas formed and the Vimsottari timeline.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Download, Gauge, LayoutGrid, ListTree, MapPin, Pencil, Printer, Sparkles, Stars } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, type RouteComponentProps } from 'wouter'
import { useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { birthFileName, toToolkitBirth } from '@/state/birthJson'
import { profileName, useProfile } from '@/state/profiles'
import { calcSettings, updateSettings, useSettings } from '@/state/settings'
import { Button } from '@/ui/components/Button'
import { ChartSwitcher, DashaTimeline, PanchangaCard, PlanetTable } from '@/ui/chart'
import { useChartData, useStrengths, useYogas } from '@/ui/forecast/data'
import { longDate } from '@/ui/forecast/dates'
import { ForecastHeader } from '@/ui/forecast/ForecastHeader'
import { ForecastDisclaimer, ForecastError, ForecastSkeleton, ProfileMissing } from '@/ui/forecast/ForecastStates'
import { Panel } from '@/ui/forecast/Section'
import { useNowJd } from '@/ui/forecast/useForecastDate'
import { Page } from '@/ui/layout/Page'
import { StrengthSection } from '@/ui/natal/StrengthSection'
import { YogaSection } from '@/ui/natal/YogaSection'

function saveJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const coordinate = (value: number, pos: string, neg: string) => `${Math.abs(value).toFixed(4)}° ${value >= 0 ? pos : neg}`

export default function ChartPage({ params }: RouteComponentProps<{ id: string }>) {
  const { t } = useT()
  const profile = useProfile(params.id)
  const settings = useSettings()
  const { data, error, retry } = useChartData(params.id)
  const strengths = useStrengths(params.id)
  const yogas = useYogas(params.id)
  const nowJd = useNowJd()
  useDocumentTitle(pageTitle(profile ? `${t('chartPage.eyebrow')} · ${profileName(profile)}` : t('profile.notFound')))
  if (!profile) return <ProfileMissing />
  const { birth } = profile
  const ayanamsa = t(`ayanamsa.${settings.ayanamsa}`)
  const yearModel = t(`yearModel.${settings.yearModel}`)
  return (
    <Page>
      <ForecastHeader
        profile={profile}
        eyebrow={t('chartPage.eyebrow')}
        title={longDate(birth.date)}
        description={<>{birth.time} · {birth.place || coordinate(birth.latitude, t('coord.n'), t('coord.s'))}</>}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm" className="h-11 px-4">
              <Link href={`/p/${profile.id}/report`}><Printer aria-hidden /> {t('chartPage.report')}</Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-11 px-4">
              <Link href={`/p/${profile.id}/edit`}><Pencil aria-hidden /> {t('chartPage.edit')}</Link>
            </Button>
          </div>
        }
      />
      {error ? <ForecastError error={error} onRetry={retry} /> : !data ? <ForecastSkeleton variant="chart" /> : (
        <div className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
            <Panel title={t('nav.chart')} icon={<LayoutGrid />} className="lg:col-span-7">
              <ChartSwitcher
                chart={data.chart}
                chartStyle={settings.chartStyle}
                onChartStyleChange={(chartStyle) => updateSettings({ chartStyle })}
                caption={{ title: birth.name || t('chartPage.eyebrow'), subtitle: `${birth.date} · ${birth.time}\n${birth.place ?? ''}` }}
              />
            </Panel>
            <div className="space-y-4 lg:col-span-5 lg:space-y-6">
              <Panel title={t('chartPage.details')} icon={<MapPin />}>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                  <Detail term={t('field.date')}>{longDate(birth.date)}</Detail>
                  <Detail term={t('field.time')}>{birth.time} <span className="text-[var(--text-muted)]">({birth.timeZone})</span></Detail>
                  <Detail term={t('field.place')}>{birth.place || '—'}</Detail>
                  <Detail term={t('field.coordinates')}>{coordinate(birth.latitude, t('coord.n'), t('coord.s'))}, {coordinate(birth.longitude, t('coord.e'), t('coord.w'))}</Detail>
                  <Detail term={t('settings.ayanamsa')}>{ayanamsa} <span className="text-[var(--text-muted)]">({data.chart.ayanamsaDegrees.toFixed(4)}°)</span></Detail>
                  <Detail term={t('chartPage.nodesYears')}>{t(`node.${settings.node}`)} · {yearModel}</Detail>
                </dl>
                <div className="mt-4 border-t border-[var(--divider)] pt-4">
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={() => saveJson(birthFileName(birth), toToolkitBirth(birth, calcSettings(settings)))}>
                    <Download aria-hidden /> {t('chartPage.export')}
                  </Button>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    {t('chartPage.exportText')}
                  </p>
                </div>
              </Panel>
              <PanchangaCard chart={data.chart} className="glass" />
            </div>
          </div>
          <Panel title={t('chartPage.planets')} description={t('chartPage.planetsText')} icon={<Sparkles />}>
            <PlanetTable chart={data.chart} />
          </Panel>
          <Panel title={t('chartPage.strength')} description={t('chartPage.strengthText')} icon={<Gauge />}>
            {strengths.error ? <ForecastError error={strengths.error} onRetry={strengths.retry} />
              : strengths.data ? <StrengthSection strengths={strengths.data} /> : <p className="text-sm text-[var(--text-muted)]">{t('chartPage.strengthLoading')}</p>}
          </Panel>
          <Panel title={t('chartPage.yogas')} description={t('chartPage.yogasText')} icon={<Stars />}>
            {yogas.error ? <ForecastError error={yogas.error} onRetry={yogas.retry} />
              : yogas.data ? <YogaSection yogas={yogas.data.yogas} /> : <p className="text-sm text-[var(--text-muted)]">{t('chartPage.yogasLoading')}</p>}
          </Panel>
          <Panel title={t('chartPage.dasha')} description={t('chartPage.dashaText')} icon={<ListTree />}>
            <DashaTimeline periods={data.dashas} now={nowJd} timeZone={birth.timeZone} />
          </Panel>
        </div>
      )}
      <ForecastDisclaimer />
    </Page>
  )
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[var(--text-muted)]">{term}</dt>
      <dd className="m-0 min-w-0 font-medium text-[var(--text)]">{children}</dd>
    </>
  )
}
