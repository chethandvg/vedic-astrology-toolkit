// Printable Kundli report for one profile: a document preview on screen (light paper sheets,
// whatever the app theme) that prints to A4 through the browser; "Download PDF" opens the print
// window, where the user saves it as a PDF. Cover, D1 and D9 charts, planets, birth panchanga,
// Vimsottari dasha, the year's outlook and transits from the same forecast call as the Year
// page, and the yogas formed and the planetary strengths (Shadbala, Vimsopaka, functional nature).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { ArrowLeft, Download } from 'lucide-react'
import { Link, type RouteComponentProps } from 'wouter'
import { T } from '@/content/active'
import { yogaContent } from '@/content/yogas'
import { functionalRole } from '@/engine/functional'
import { GRAHAS } from '@/engine/strengths'
import { rich, t, useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { profileName, useProfile } from '@/state/profiles'
import { useSettings } from '@/state/settings'
import { PanchangaCard } from '@/ui/chart/PanchangaCard'
import { activeChain } from '@/ui/chart/dasha'
import { Button } from '@/ui/components/Button'
import { Callout } from '@/ui/components/Callout'
import { Spinner } from '@/ui/components/Spinner'
import { shortPlaceName, useChartData, useForecast, useStrengths, useTimingsPlace, useYogas } from '@/ui/forecast/data'
import { dateParts } from '@/ui/forecast/dates'
import { ForecastError, ProfileMissing } from '@/ui/forecast/ForecastStates'
import { useForecastDate, useNowJd } from '@/ui/forecast/useForecastDate'
import { groupMetYogas } from '@/ui/natal/YogaSection'
import {
  APP_URL, hasSlotContent, ReportCharts, ReportCover, ReportDasha, ReportOutlook, ReportPlanetTable, ReportSection, ReportStrengths,
  ReportTransits, ReportYogas, SectionStatus, Sheet, type ContentsEntry, type ReportStrengthsProps, type ReportYogasProps,
} from '@/ui/report'

interface ReportExtensions {
  yogas?: ReportYogasProps
  strengths?: ReportStrengthsProps
  /** Both have arrived (or failed, which leaves their sections out). */
  settled: boolean
}

const NATURE_LABEL = { supportive: ['yoga.supportive', 'good'], challenging: ['yoga.challenging', 'bad'], mixed: ['yoga.mixed', 'mixed'] } as const

/** The profile's met yogas and planetary strengths for the extension slots, from the engine worker. */
function useReportExtensions(profileId: string): ReportExtensions {
  useT()
  const yogas = useYogas(profileId)
  const strengths = useStrengths(profileId)
  const out: ReportExtensions = { settled: (!!yogas.data || !!yogas.error) && (!!strengths.data || !!strengths.error) }
  if (yogas.data) {
    const groups = groupMetYogas(yogas.data.yogas)
    out.yogas = {
      intro: T.YOGA_INTRO,
      items: (['supportive', 'challenging', 'mixed'] as const).flatMap((nature) => groups[nature].map((y) => ({
        name: yogaContent(y.name)?.title ?? y.name,
        category: t(`yogaCat.${y.category}`),
        status: t(NATURE_LABEL[nature][0]), statusTone: NATURE_LABEL[nature][1],
        summary: yogaContent(y.name)?.meaning,
        participants: y.participants,
        source: t('report.yogaSource', { page: y.pdfPage }),
      }))),
    }
  }
  const s = strengths.data
  if (s) {
    const sb = s.shadbala.status === 'complete' ? s.shadbala : null
    out.strengths = {
      intro: sb ? T.STRENGTH_INTRO : `${t('strength.unavailable')}: ${s.shadbala.status === 'complete' ? '' : s.shadbala.reason}`,
      items: GRAHAS.map((p) => {
        const role = s.functional.yogakarakas.includes(p) ? 'yogakaraka' : functionalRole(s.functional, p)
        return {
          planet: p,
          ...(sb ? { shadbala: sb.planets[p].rupas, required: sb.planets[p].requiredVirupas / 60 } : {}),
          vimsopaka: s.vimsopaka.shodasa[p].total,
          note: T.FUNCTIONAL_ROLE_LABEL[role],
        }
      }),
    }
  }
  return out
}

export default function ReportPage({ params }: RouteComponentProps<{ id: string }>) {
  const { t } = useT()
  const profile = useProfile(params.id)
  const settings = useSettings()
  const chartData = useChartData(params.id)
  const { place } = useTimingsPlace(profile)
  // "This year" in the user's place; ?date= picks the year of another date, as on the Year page.
  const nav = useForecastDate('year', profile)
  const yearQuery = useForecast(params.id, 'year', nav.anchor)
  const nowJd = useNowJd()
  const extensions = useReportExtensions(params.id)
  useDocumentTitle(pageTitle(profile ? `${t('report.title')} · ${profileName(profile)}` : t('profile.notFound')))
  if (!profile) return <ProfileMissing />

  const year = dateParts(nav.anchor).year
  const chart = chartData.data?.chart
  const dashas = chartData.data?.dashas
  const forecast = yearQuery.data
  const ready = !!chart && !!forecast && !yearQuery.loading && extensions.settled
  const yogas = hasSlotContent(extensions.yogas) ? extensions.yogas : undefined
  const strengths = hasSlotContent(extensions.strengths) ? extensions.strengths : undefined
  const contents: ContentsEntry[] = [
    { id: 'report-charts', title: t('report.charts') },
    { id: 'report-planets', title: t('report.planets') },
    { id: 'report-panchanga', title: t('report.panchanga') },
    { id: 'report-dasha', title: t('chartPage.dasha') },
    { id: 'report-year', title: t('report.year', { year }) },
    { id: 'report-transits', title: t('report.transits') },
    ...(yogas ? [{ id: 'report-yogas', title: t('chartPage.yogas') }] : []),
    ...(strengths ? [{ id: 'report-strengths', title: t('report.strengths') }] : []),
  ]
  const number = (id: string) => contents.findIndex((c) => c.id === id) + 1
  const title = (id: string) => contents.find((c) => c.id === id)!.title
  const section = (id: string) => ({ id, number: number(id), title: title(id) })
  const ayanamsa = t(`ayanamsa.${settings.ayanamsa}`)
  const yearStatus = yearQuery.error
    ? <ForecastError error={yearQuery.error} onRetry={yearQuery.retry} className="report-screen-only" />
    : <SectionStatus>{t('report.preparingYear', { year })}</SectionStatus>

  return (
    <div className="report-doc mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      <div className="report-screen-only mx-auto mb-6 max-w-[210mm] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-3 h-11">
            <Link href={`/p/${profile.id}/chart`}><ArrowLeft aria-hidden /> {t('report.back')}</Link>
          </Button>
          <Button onClick={() => window.print()} disabled={!ready} className="h-11">
            {ready ? <Download aria-hidden /> : <Spinner className="size-4 text-current" label={t('report.preparing')} />}
            {t('report.pdf')}
          </Button>
        </div>
        <Callout title={t('report.pdfTitle')}>
          <p>
            {rich(t('report.pdfHelp'), { save: <strong className="font-semibold text-[var(--text)]">{t('report.saveAsPdf')}</strong> })}
          </p>
        </Callout>
      </div>

      <div className="report-paper">
        <ReportCover
          profile={profile} settings={settings} chart={chart} contents={contents} today={nav.today}
          dasha={dashas ? activeChain(dashas, nowJd) : undefined}
        />

        {chartData.error ? (
          <Sheet className="report-screen-only">
            <ForecastError error={chartData.error} onRetry={chartData.retry} />
          </Sheet>
        ) : !chart || !dashas ? (
          <Sheet><SectionStatus>{t('report.calculating')}</SectionStatus></Sheet>
        ) : (
          <>
            <Sheet label={t('report.sheetCharts')}>
              <ReportSection {...section('report-charts')} description={t('report.chartsText', { style: t(settings.chartStyle === 'north' ? 'chart.northIndian' : 'chart.southIndian') })}>
                <ReportCharts chart={chart} chartStyle={settings.chartStyle} />
              </ReportSection>
              <ReportSection {...section('report-planets')}>
                <ReportPlanetTable chart={chart} />
              </ReportSection>
            </Sheet>
            <Sheet label={t('report.sheetPanchanga')}>
              <ReportSection {...section('report-panchanga')} description={t('report.panchangaText')}>
                <PanchangaCard chart={chart} className="report-avoid-break report-panchanga" />
              </ReportSection>
              <ReportSection {...section('report-dasha')} description={t('report.dashaText')}>
                <ReportDasha periods={dashas} now={nowJd} birthJd={chart.jd} timeZone={profile.birth.timeZone} />
              </ReportSection>
            </Sheet>
          </>
        )}

        <Sheet label={t('report.sheetYear')}>
          <ReportSection {...section('report-year')} description={t('report.yearText', { year })}>
            {forecast ? <ReportOutlook forecast={forecast} /> : yearStatus}
          </ReportSection>
        </Sheet>
        <Sheet label={t('report.sheetTransits')}>
          <ReportSection {...section('report-transits')} description={t('report.transitsText')}>
            {forecast
              ? <ReportTransits forecast={forecast} extras={yearQuery.extras} timeZone={place.timeZone} placeName={shortPlaceName(place)} />
              : yearStatus}
          </ReportSection>
          {!yogas && !strengths && <AboutReport ayanamsa={ayanamsa} />}
        </Sheet>

        {yogas && (
          <Sheet label={t('chartPage.yogas')}>
            <ReportSection {...section('report-yogas')}>
              <ReportYogas {...yogas} />
            </ReportSection>
            {!strengths && <AboutReport ayanamsa={ayanamsa} />}
          </Sheet>
        )}
        {strengths && (
          <Sheet label={t('report.strengths')}>
            <ReportSection {...section('report-strengths')}>
              <ReportStrengths {...strengths} />
            </ReportSection>
            <AboutReport ayanamsa={ayanamsa} />
          </Sheet>
        )}
      </div>
    </div>
  )
}

function AboutReport({ ayanamsa }: { ayanamsa: string }) {
  const { t } = useT()
  return (
    <section aria-labelledby="report-about-title" className="report-avoid-break mt-10 border-t border-[var(--divider)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]">
      <h2 id="report-about-title" className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">{t('report.about')}</h2>
      <p>
        {t('report.aboutText', { ayanamsa })}
      </p>
      <p className="mt-1.5">{t('common.disclaimer')}</p>
      <p className="mt-1.5">Jyotish Daily · {APP_URL}</p>
    </section>
  )
}
