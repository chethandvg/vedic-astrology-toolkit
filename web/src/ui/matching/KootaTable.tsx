// The eight kootas: what each compares, both partners' values, the points out of its maximum and
// a plain reading; then the Nadi and Bhakoot dosha notes with their exceptions, kept apart from
// the raw score.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { matchValue } from './values'
import { useT } from '@/i18n'
import type { Ashtakoota, DoshaCheck } from '@/engine/matching'
import { Callout } from '@/ui/components/Callout'
import { TONE_VARS, type Tone } from '@/ui/forecast/meta'
import { gunas } from './MatchHero'

const share = (points: number, max: number): Tone => (points >= max ? 'good' : points / max >= 0.5 ? 'mixed' : 'bad')

export function KootaTable({ ashtakoota, groomName, brideName }: { ashtakoota: Ashtakoota; groomName: string; brideName: string }) {
  const { t, n } = useT()
  return (
    <div>
      <div aria-hidden className="hidden border-b border-[var(--divider)] pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_9rem] md:gap-4">
        <span>{t('match.koota')}</span>
        <span className="truncate">{groomName}</span>
        <span className="truncate">{brideName}</span>
        <span className="text-right">{t('match.points')}</span>
      </div>
      <ul aria-label={t('match.pointsAria')} className="text-sm">
        {ashtakoota.kootas.map((k) => {
          const tone = TONE_VARS[share(k.points, k.max)]
          return (
            <li key={k.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-[var(--divider)] py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_9rem] md:items-start">
              <div className="min-w-0">
                <h3 className="font-semibold text-[var(--text)]">{n.koota[k.key]} <span className="font-normal text-[var(--text-muted)]">· {t('match.max', { n: k.max })}</span></h3>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-[var(--text-muted)]">{T.KOOTA_TEXT[k.key].about}</p>
                <p className="mt-1.5 text-[0.85rem] leading-snug text-[var(--text)]">{T.kootaOutcome(k.key, k.points, k.max)}</p>
              </div>
              <p className="col-span-2 row-start-2 mt-1 text-[0.8rem] md:col-span-1 md:row-start-auto md:mt-0 md:text-sm">
                <span className="text-[var(--text-muted)] md:sr-only">{groomName}: </span>
                <span className="font-medium text-[var(--text)]">{matchValue(k.groom, n)}</span>
              </p>
              <p className="col-span-2 row-start-3 text-[0.8rem] md:col-span-1 md:row-start-auto md:text-sm">
                <span className="text-[var(--text-muted)] md:sr-only">{brideName}: </span>
                <span className="font-medium text-[var(--text)]">{matchValue(k.bride, n)}</span>
              </p>
              <div className="col-start-2 row-start-1 w-24 text-right md:col-start-auto md:row-start-auto md:w-auto">
                <p className="font-display text-lg font-semibold tabular-nums leading-none" style={{ color: tone.fg }}>
                  {gunas(k.points)}<span className="text-sm font-medium text-[var(--text-muted)]"> / {k.max}</span>
                </p>
                <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${(k.points / k.max) * 100}%`, background: tone.solid }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-[var(--surface-border)] pt-3">
        <span className="font-semibold">{t('match.total')}</span>
        <span className="font-display text-xl font-semibold tabular-nums">{gunas(ashtakoota.total)} <span className="text-sm font-medium text-[var(--text-muted)]">/ 36</span></span>
      </div>
      <DoshaNotes ashtakoota={ashtakoota} />
    </div>
  )
}

function DoshaNote({ title, intro, check }: { title: string; intro: string; check: DoshaCheck }) {
  const { t } = useT()
  return (
    <Callout tone={check.cancelled ? 'info' : 'warning'} title={check.cancelled ? t('match.cancelled', { title }) : title}>
      <p>{intro}</p>
      {check.exceptions.length ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          {check.exceptions.map((e) => <li key={e}>{T.DOSHA_EXCEPTION_TEXT[e]}</li>)}
        </ul>
      ) : (
        <p className="mt-1">{T.DOSHA_TEXT.noException}</p>
      )}
    </Callout>
  )
}

function DoshaNotes({ ashtakoota: a }: { ashtakoota: Ashtakoota }) {
  const { t, n } = useT()
  if (!a.nadiDosha.present && !a.bhakootDosha.present) return null
  return (
    <div className="mt-5 space-y-3" aria-label={t('match.doshaNotes')} role="group">
      {a.nadiDosha.present && <DoshaNote title={t('match.dosha', { name: n.koota.nadi })} intro={T.DOSHA_TEXT.nadiPresent} check={a.nadiDosha} />}
      {a.bhakootDosha.present && <DoshaNote title={t('match.dosha', { name: n.koota.bhakoot })} intro={T.DOSHA_TEXT.bhakootPresent} check={a.bhakootDosha} />}
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        {T.DOSHA_TEXT.rawScore}
        {a.adjustedTotal !== a.total && <> {T.DOSHA_TEXT.adjusted(gunas(a.adjustedTotal))}</>}
      </p>
    </div>
  )
}
