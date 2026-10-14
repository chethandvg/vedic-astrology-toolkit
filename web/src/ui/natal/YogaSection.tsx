// Yogas of the birth chart: the met rules grouped by their nature (supportive, asking for care,
// mixed) with friendly names, meanings, the planets that form them and the book's page, and a
// disclosure listing every one of the 170 rules checked with its status.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { t, useT } from '@/i18n'
import { yogaContent, type YogaNature } from '@/content/yogas'
import type { YogaCategory, YogaResult, YogaStatus } from '@/engine/yogas'
import { bodyColor } from '@/ui/chart/planets'
import { Badge, type BadgeTone } from '@/ui/components/Badge'
import { Disclosure } from '@/ui/components/Disclosure'

const NATURE_TONE: Readonly<Record<YogaNature, BadgeTone>> = { supportive: 'good', challenging: 'bad', mixed: 'mixed' }
const STATUS: Readonly<Record<YogaStatus, { label: string; tone: BadgeTone }>> = {
  conditions_met: { get label() { return t('yoga.formed') }, tone: 'good' },
  conditions_not_met: { get label() { return t('yoga.notFormed') }, tone: 'neutral' },
  conditions_pending: { get label() { return t('yoga.undecided') }, tone: 'mixed' },
}
const ORDER: readonly YogaNature[] = ['supportive', 'challenging', 'mixed']

const titleOf = (y: YogaResult) => yogaContent(y.name)?.title ?? y.name
const natureOf = (y: YogaResult): YogaNature => yogaContent(y.name)?.nature ?? 'mixed'

/** Met yogas by nature, in the order the toolkit checks them. */
export function groupMetYogas(yogas: readonly YogaResult[]): Record<YogaNature, YogaResult[]> {
  const out: Record<YogaNature, YogaResult[]> = { supportive: [], challenging: [], mixed: [] }
  for (const y of yogas) if (y.status === 'conditions_met') out[natureOf(y)].push(y)
  return out
}

export function YogaSection({ yogas }: { yogas: readonly YogaResult[] }) {
  const { t } = useT()
  const groups = groupMetYogas(yogas)
  const met = ORDER.reduce((n, k) => n + groups[k].length, 0)
  const pending = yogas.filter((y) => y.status === 'conditions_pending').length
  return (
    <div className="space-y-5">
      <p className="text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{T.YOGA_INTRO}</p>
      {met === 0 && <p className="text-sm text-[var(--text-muted)]">{t('yoga.none', { n: yogas.length })}</p>}
      {ORDER.filter((k) => groups[k].length).map((k) => (
        <section key={k} aria-label={T.YOGA_GROUP_TITLE[k]}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            {T.YOGA_GROUP_TITLE[k]} <Badge tone={NATURE_TONE[k]}>{groups[k].length}</Badge>
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {groups[k].map((y) => <YogaCard key={y.name} yoga={y} />)}
          </ul>
        </section>
      ))}
      <Disclosure title={t(pending ? 'yoga.allPending' : 'yoga.all', { n: yogas.length, met, pending })} className="border-t border-[var(--divider)] pt-2">
        <AllYogas yogas={yogas} />
        {pending > 0 && <p className="pb-2 pt-3 text-xs leading-relaxed text-[var(--text-muted)]">{T.YOGA_PENDING_NOTE}</p>}
      </Disclosure>
    </div>
  )
}

function YogaCard({ yoga }: { yoga: YogaResult }) {
  const { t, n } = useT()
  const c = yogaContent(yoga.name)
  return (
    <li className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <p className="text-pretty font-semibold leading-snug text-[var(--text)]">{titleOf(yoga)}</p>
      {yoga.participants.length > 0 && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {t('yoga.formedBy')} {yoga.participants.map((p, i) => <span key={p}>{i > 0 && ', '}<span className="font-medium" style={{ color: bodyColor(p) }}>{n.body[p]}</span></span>)}
        </p>
      )}
      {c && <p className="mt-2 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{c.meaning}</p>}
      {c && <p className="mt-1.5 text-pretty text-xs leading-relaxed text-[var(--text-muted)]">{c.hint}</p>}
      <p className="mt-2 text-[0.7rem] text-[var(--text-muted)]">{t(`yogaCat.${yoga.category}`)} · {t('yoga.page', { page: yoga.pdfPage })}</p>
      {yoga.notice && <p className="mt-1 text-[0.7rem] italic text-[var(--text-muted)]">{yoga.notice}</p>}
    </li>
  )
}

function AllYogas({ yogas }: { yogas: readonly YogaResult[] }) {
  const { t } = useT()
  const byCategory = new Map<YogaCategory, YogaResult[]>()
  for (const y of yogas) byCategory.set(y.category, [...(byCategory.get(y.category) ?? []), y])
  return (
    <div className="space-y-4 pb-2 pt-1">
      {[...byCategory].map(([category, list]) => (
        <section key={category} aria-label={t(`yogaCat.${category}`)}>
          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{t(`yogaCat.${category}`)}</h4>
          <ul className="mt-1.5 divide-y divide-[var(--divider)]">
            {list.map((y) => (
              <li key={y.name} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 text-pretty text-[var(--text)]">{titleOf(y)} <span className="text-xs text-[var(--text-muted)]">{t('yoga.p', { page: y.pdfPage })}</span></span>
                <Badge tone={STATUS[y.status].tone} className="shrink-0">{STATUS[y.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
