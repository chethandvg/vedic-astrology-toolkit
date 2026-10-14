// Developer showcase for the chart components, rendered from fixture data (book
// Example 118) so they can be reviewed without the engine worker. Route: /dev/chart.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useMemo, type ReactNode } from 'react'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { ChartSwitcher, DashaTimeline, NorthIndianChart, PanchangaCard, PlanetTable, SouthIndianChart, type ChartCaption } from '@/ui/chart'
import { crowdedDemoChart, crowdedLagnaDemoChart, demoChart, demoDashas } from '@/ui/chart/demo'
import { Page } from '@/ui/layout/Page'

/** Current instant as JD (UTC stands in for UT1; the sub-second difference is irrelevant here). */
const nowJd = () => Date.now() / 86_400_000 + 2440587.5

/** Long enough to wrap and be shortened in the South Indian centre. */
const LONG_CAPTION: ChartCaption = {
  title: 'Venkata Lakshminarasimha Chakravarthy Subrahmanyam',
  subtitle: 'Synthetic test data\nThiruvananthapuram, Kerala, India',
}

function civilDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default function DevChartPage() {
  useDocumentTitle(pageTitle('Chart components'))
  const now = useMemo(nowJd, [])
  const crowded = useMemo(crowdedDemoChart, [])
  const crowdedLagna = useMemo(crowdedLagnaDemoChart, [])
  const { input } = demoChart
  const caption: ChartCaption = {
    title: input.name ?? 'Birth chart',
    subtitle: `${civilDate(input.date)} · ${input.time} (UTC${input.timeZone})\n${input.place ?? ''}`,
  }
  return (
    <Page>
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--accent)">Developer preview</p>
        <h1 className="mt-2 font-display text-3xl text-(--text) sm:text-4xl">Chart components</h1>
        <p className="mt-2 text-(--text-muted)">
          Every chart visual rendered from the Python toolkit's golden fixture for the book's Example 118, plus a synthetic
          crowded chart that stress-tests label fitting.
        </p>
      </header>

      <Section title="Chart switcher" note="Style and division controls; Jupiter is highlighted.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Card><ChartSwitcher chart={demoChart} caption={caption} highlight={['Jupiter']} /></Card>
          <PanchangaCard chart={demoChart} className="self-start" />
        </div>
      </Section>

      <Section title="North and South Indian" note="Rasi (D1) with degrees and Navamsa (D9) without.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card><NorthIndianChart chart={demoChart} caption={caption} /></Card>
          <Card><SouthIndianChart chart={demoChart} caption={caption} /></Card>
          <Card><NorthIndianChart chart={demoChart} varga={9} /></Card>
          <Card><SouthIndianChart chart={demoChart} varga={9} /></Card>
        </div>
      </Section>

      <Section title="Planet positions">
        <Card><PlanetTable chart={demoChart} /></Card>
      </Section>

      <Section title="Vimsottari dasha" note="Solar-year dashas from the fixture; the current periods are marked.">
        <Card><DashaTimeline periods={demoDashas} now={now} timeZone={input.timeZone} /></Card>
      </Section>

      <Section title="Stress test" note="Synthetic positions: seven bodies in the narrow 3rd house, then seven in the lagna, with a long name.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card><NorthIndianChart chart={crowded} highlight={['Moon', 'Saturn']} /></Card>
          <Card><SouthIndianChart chart={crowded} caption={{ title: 'Crowded houses', subtitle: 'Synthetic test data' }} highlight={['Moon', 'Saturn']} /></Card>
          <Card><NorthIndianChart chart={crowdedLagna} caption={LONG_CAPTION} highlight={['Sun', 'Venus']} /></Card>
          <Card><SouthIndianChart chart={crowdedLagna} caption={LONG_CAPTION} highlight={['Sun', 'Venus']} /></Card>
        </div>
      </Section>
    </Page>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10 first-of-type:mt-0">
      <h2 className="font-display text-xl text-(--text)">{title}</h2>
      {note && <p className="mt-1 text-sm text-(--text-muted)">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-card border border-(--surface-border) bg-(--bg-elevated) p-4 shadow-glow backdrop-blur sm:p-6">{children}</div>
}
