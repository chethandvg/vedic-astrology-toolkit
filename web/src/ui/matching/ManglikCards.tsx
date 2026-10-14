// Manglik (Kuja) dosha for each partner: Mars's house from the ascendant, the Moon and Venus, the
// exceptions that hold, and what the pair's combination means in the tradition.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { t, useT } from '@/i18n'
import type { ManglikMatch, ManglikReport } from '@/engine/matching'
import { Badge } from '@/ui/components/Badge'
import { Callout } from '@/ui/components/Callout'
import type { Tone } from '@/ui/forecast/meta'
import { TONE_ICON } from './MatchHero'


function status(r: ManglikReport): { label: string; tone: Tone; text: string } {
  if (!r.present) return { label: t('manglik.not'), tone: 'good', text: T.MANGLIK_TEXT.clear }
  if (r.active) return { label: t('manglik.yes'), tone: 'bad', text: T.MANGLIK_TEXT.active }
  return { label: t('manglik.cleared'), tone: 'mixed', text: T.MANGLIK_TEXT.cleared }
}

function ManglikCard({ name, role, report }: { name: string; role: string; report: ManglikReport }) {
  const { t, n } = useT()
  const from = (p: string) => (p === 'Lagna' ? n.body.Asc : n.body[p as 'Moon' | 'Venus'])
  const s = status(report)
  const Icon = TONE_ICON[s.tone]
  return (
    <article aria-label={t('manglik.aria', { name })} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{role}</p>
          <h3 className="truncate font-display text-lg font-semibold">{name}</h3>
        </div>
        <Badge tone={s.tone} size="md"><Icon aria-hidden />{s.label}</Badge>
      </div>
      <p className="mt-2 text-sm leading-snug text-[var(--text)]">{s.text}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{t('manglik.mars', { mars: n.body.Mars, sign: n.sign[report.marsSign] })}</p>
      <ul className="mt-3 grid grid-cols-3 gap-2" aria-label={t('manglik.countedFrom', { mars: n.body.Mars })}>
        {report.placements.map((p) => {
          const tone = !p.inDoshaHouse ? 'neutral' : p.excepted ? 'mixed' : 'bad'
          return (
            <li key={p.from} className="rounded-xl border border-[var(--surface-border)] px-2 py-2 text-center">
              <p className="text-[0.7rem] text-[var(--text-muted)]">{from(p.from)}</p>
              <p className="font-display text-lg font-semibold tabular-nums leading-tight">{n.ordinal(p.house)}</p>
              <Badge tone={tone} className="mt-1">{t(!p.inDoshaHouse ? 'manglik.clear' : p.excepted ? 'manglik.exception' : 'manglik.dosha')}</Badge>
            </li>
          )
        })}
      </ul>
      {report.present && (report.cancellations.length > 0 || report.placements.some((p) => p.excepted)) && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-[0.8rem] leading-snug text-[var(--text-muted)]">
          {report.placements.some((p) => p.excepted) && <li>{T.MANGLIK_TEXT.houseException}</li>}
          {report.cancellations.map((c) => <li key={c}>{T.MANGLIK_CANCELLATION_TEXT[c]}</li>)}
        </ul>
      )}
    </article>
  )
}

export function ManglikCards({ manglik, groomName, brideName }: { manglik: ManglikMatch; groomName: string; brideName: string }) {
  const { t } = useT()
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        <ManglikCard name={groomName} role={t('match.groom')} report={manglik.groom} />
        <ManglikCard name={brideName} role={t('match.bride')} report={manglik.bride} />
      </div>
      <Callout tone={manglik.outcome === 'groom' || manglik.outcome === 'bride' ? 'warning' : 'info'} className="mt-4">
        {T.MANGLIK_OUTCOME_TEXT[manglik.outcome]}
      </Callout>
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">{T.MANGLIK_TEXT.about}</p>
    </div>
  )
}
