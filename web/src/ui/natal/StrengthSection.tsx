// Planetary strength in the birth chart: Shadbala per planet as a bar with its required minimum
// marked, Vimsopaka out of 20 in two varga groups, and the functional nature of each planet for
// the rising sign (helpful, neutral, harder, yogakaraka).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { useT } from '@/i18n'
import type { FunctionalNature } from '@/engine/functional'
import { GRAHAS, type NatalStrengths } from '@/engine/strengths'
import type { Planet } from '@/engine/types'
import { cn } from '@/lib/cn'
import { bodyColor } from '@/ui/chart/planets'
import { Badge, type BadgeTone } from '@/ui/components/Badge'
import { Callout } from '@/ui/components/Callout'

export function StrengthSection({ strengths }: { strengths: NatalStrengths }) {
  const { t, n } = useT()
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h3 className="text-sm font-semibold text-[var(--text)]">Shadbala</h3>
        <p className="mb-3 mt-1 text-pretty text-xs leading-relaxed text-[var(--text-muted)]">{T.STRENGTH_INTRO}</p>
        <ShadbalaBars strengths={strengths} />
      </div>
      <div className="space-y-6 lg:col-span-5">
        <section aria-labelledby="functional-title">
          <h3 id="functional-title" className="text-sm font-semibold text-[var(--text)]">
            {t('strength.functional', { sign: n.sign[strengths.functional.ascendant] })}
          </h3>
          <p className="mb-3 mt-1 text-pretty text-xs leading-relaxed text-[var(--text-muted)]">{T.FUNCTIONAL_INTRO}</p>
          <FunctionalChips nature={strengths.functional} />
        </section>
        <section aria-labelledby="vimsopaka-title">
          <h3 id="vimsopaka-title" className="text-sm font-semibold text-[var(--text)]">Vimsopaka</h3>
          <p className="mb-2 mt-1 text-pretty text-xs leading-relaxed text-[var(--text-muted)]">{T.VIMSOPAKA_INTRO}</p>
          <VimsopakaTable strengths={strengths} />
        </section>
      </div>
    </div>
  )
}

function ShadbalaBars({ strengths }: { strengths: NatalStrengths }) {
  const { t, n } = useT()
  const sb = strengths.shadbala
  if (sb.status !== 'complete') return <Callout title={t('strength.unavailable')}><p>{sb.reason}</p></Callout>
  const rows = GRAHAS.map((p) => ({ planet: p, rupas: sb.planets[p].rupas, required: sb.planets[p].requiredVirupas / 60, ratio: sb.planets[p].ratioToRequirement }))
  const scale = Math.max(...rows.map((r) => Math.max(r.rupas, r.required))) * 1.05
  return (
    <ul className="space-y-2.5" aria-label={t('strength.byPlanet')}>
      {rows.map((r) => {
        const strong = r.ratio >= 1
        return (
          <li key={r.planet} className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-x-3 text-sm">
            <span className="font-medium" style={{ color: bodyColor(r.planet) }}>{n.body[r.planet]}</span>
            <span className="relative h-3 rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--surface-border)]" aria-hidden>
              <span
                className={cn('absolute inset-y-0 left-0 rounded-full', strong ? 'bg-[var(--good-fg)]' : 'bg-[var(--mixed-fg)]')}
                style={{ width: `${(r.rupas / scale) * 100}%`, opacity: 0.75 }}
              />
              <span className="absolute -inset-y-1 w-0.5 rounded bg-[var(--text)]" style={{ left: `${(r.required / scale) * 100}%` }} title={t('strength.required')} />
            </span>
            <span className="tabular-nums text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text)]">{r.rupas.toFixed(2)}</span> / {r.required.toFixed(1)}
              <span className="sr-only"> {t(strong ? 'strength.srAbove' : 'strength.srBelow', { min: r.required.toFixed(1) })}</span>
            </span>
          </li>
        )
      })}
      <li className="pt-1 text-[0.7rem] text-[var(--text-muted)]">
        {t('strength.legend')}
      </li>
    </ul>
  )
}

function VimsopakaTable({ strengths }: { strengths: NatalStrengths }) {
  const { t, n } = useT()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('strength.vimsopakaCaption')}</caption>
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)]">
            <th scope="col" className="py-1 font-medium">{t('strength.planet')}</th>
            <th scope="col" className="py-1 text-right font-medium">{t('strength.vargas', { n: 6 })}</th>
            <th scope="col" className="py-1 text-right font-medium">{t('strength.vargas', { n: 16 })}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--divider)]">
          {GRAHAS.map((p) => (
            <tr key={p}>
              <th scope="row" className="py-1 text-left font-medium" style={{ color: bodyColor(p) }}>{n.body[p]}</th>
              <td className="py-1 text-right tabular-nums">{strengths.vimsopaka.shad[p].total.toFixed(1)}</td>
              <td className="py-1 text-right tabular-nums">{strengths.vimsopaka.shodasa[p].total.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ROLE_TONE: Readonly<Record<'yogakaraka' | 'benefic' | 'neutral' | 'malefic' | 'unclassified', BadgeTone>> = {
  yogakaraka: 'accent', benefic: 'good', neutral: 'neutral', malefic: 'bad', unclassified: 'neutral',
}

function FunctionalChips({ nature }: { nature: FunctionalNature }) {
  const { n } = useT()
  const groups: { key: keyof typeof ROLE_TONE; planets: Planet[] }[] = [
    { key: 'yogakaraka', planets: nature.yogakarakas },
    { key: 'benefic', planets: nature.benefics.filter((p) => !nature.yogakarakas.includes(p)) },
    { key: 'neutral', planets: nature.neutrals.filter((p) => !nature.yogakarakas.includes(p)) },
    { key: 'malefic', planets: nature.malefics },
    { key: 'unclassified', planets: nature.unclassified },
  ]
  return (
    <dl className="space-y-2">
      {groups.filter((g) => g.planets.length).map((g) => (
        <div key={g.key} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <dt className="w-full text-xs text-[var(--text-muted)] sm:w-44">{T.FUNCTIONAL_ROLE_LABEL[g.key]}</dt>
          {g.planets.map((p) => (
            <dd key={p} className="m-0"><Badge tone={ROLE_TONE[g.key]} size="md">{n.body[p]}</Badge></dd>
          ))}
        </div>
      ))}
    </dl>
  )
}
