// The ten South Indian poruthams as a grid of tiles: agreement icon, name, what the check rests
// on and a plain reading, with Rajju and Vedha marked as the essential pair.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CircleCheck, CircleMinus, CircleX, type LucideIcon } from 'lucide-react'
import { T } from '@/content/active'
import { t, useT } from '@/i18n'
import type { DasaPorutham, PoruthamStatus } from '@/engine/matching'
import { cn } from '@/lib/cn'
import { Callout } from '@/ui/components/Callout'
import { Disclosure } from '@/ui/components/Disclosure'
import { TONE_VARS, type Tone } from '@/ui/forecast/meta'

const STATUS: Record<PoruthamStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  match: { get label() { return t('porutham.agrees') }, tone: 'good', icon: CircleCheck },
  partial: { get label() { return t('porutham.partly') }, tone: 'mixed', icon: CircleMinus },
  no: { get label() { return t('porutham.no') }, tone: 'bad', icon: CircleX },
}
const ESSENTIAL = new Set(['rajju', 'vedha'])

export function PoruthamGrid({ porutham }: { porutham: DasaPorutham }) {
  const { t, n } = useT()
  return (
    <div>
      <ul aria-label={t('match.poruthams')} className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-5">
        {porutham.items.map((p) => {
          const s = STATUS[p.status]
          const tone = TONE_VARS[s.tone]
          const Icon = s.icon
          return (
            <li
              key={p.key}
              className={cn('flex flex-col rounded-2xl border p-3.5', ESSENTIAL.has(p.key) && 'ring-1 ring-[var(--accent-soft)]')}
              style={{ borderColor: tone.border, background: `color-mix(in oklab, ${tone.bg} 55%, transparent)` }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight text-[var(--text)]">{n.porutham[p.key]}</h3>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: tone.fg }}>
                  <Icon aria-hidden className="size-4" />
                  {s.label}
                </span>
              </div>
              {ESSENTIAL.has(p.key) && <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)]">{t('porutham.essential')}</p>}
              <p className="mt-1.5 text-[0.8rem] leading-snug text-[var(--text-muted)]">{p.basis}</p>
              <p className="mt-1.5 text-[0.85rem] leading-snug text-[var(--text)]">{T.poruthamOutcome(p.key, p.status)}</p>
            </li>
          )
        })}
      </ul>
      <Callout tone={porutham.essentialsAgree ? 'info' : 'warning'} className="mt-4">
        {porutham.essentialsAgree ? T.PORUTHAM_SUMMARY.essentialsOk : T.PORUTHAM_SUMMARY.essentialsNot}
      </Callout>
      <Disclosure title={t('porutham.about')} className="mt-2">
        <dl className="grid gap-x-6 gap-y-2 pb-1 pt-1 text-sm sm:grid-cols-2">
          {porutham.items.map((p) => (
            <div key={p.key}>
              <dt className="font-semibold text-[var(--text)]">{n.porutham[p.key]}</dt>
              <dd className="text-[var(--text-muted)]">{T.PORUTHAM_TEXT[p.key].about}</dd>
            </div>
          ))}
        </dl>
      </Disclosure>
    </div>
  )
}
