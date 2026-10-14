// The reasons behind a rating, grouped Supportive / Neutral / Challenging. Each card shows
// its title, how much it counts (a small bar) and the plain-language text; opening it shows
// the whole text and where the rule comes from. A long list can start with its heaviest few.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { BookOpen, ChevronDown, ChevronsDown, ChevronsUp } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { useId, useState } from 'react'
import type { Effect, Reason } from '@/engine/types'
import { t, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/Button'
import { leadingReasons } from './balance'
import { EFFECT_META, factorIcon, TONE_VARS } from './meta'
import { SectionTitle } from './Section'

const ORDER: readonly Effect[] = [1, 0, -1]

/** "Strong influence" / "Moderate influence" / "Light influence" relative to the heaviest reason in the list. */
function influence(weight: number, max: number): string {
  const r = weight / max
  return t(r > 0.75 ? 'reasons.strong' : r > 0.4 ? 'reasons.moderate' : 'reasons.light')
}

export function ReasonList({ reasons, title, description, columns = false, initial, className }: {
  reasons: readonly Reason[]
  title?: string
  description?: string
  /** Two columns of cards on wide screens, for a full-width list. */
  columns?: boolean
  /** Show only this many of the heaviest reasons until "Show all" is pressed. */
  initial?: number
  className?: string
}) {
  const { t } = useT()
  const headingId = useId()
  const listId = useId()
  const [all, setAll] = useState(false)
  if (!reasons.length) return null
  const max = Math.max(...reasons.map((r) => r.weight))
  const collapsible = initial !== undefined && reasons.length > initial
  const shown = collapsible && !all ? leadingReasons(reasons, initial) : null
  return (
    <section aria-labelledby={headingId} className={className}>
      <SectionTitle id={headingId} description={description}>{title ?? t('reasons.why')}</SectionTitle>
      <div id={listId} className="space-y-6">
        {ORDER.map((effect) => {
          const group = reasons.filter((r) => r.effect === effect).sort((a, b) => b.weight - a.weight)
          const visible = shown ? group.filter((r) => shown.has(r)) : group
          if (!visible.length) return null
          const meta = EFFECT_META[effect]
          const Icon = meta.icon
          return (
            <div key={effect}>
              <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: TONE_VARS[meta.tone].fg }}>
                <Icon aria-hidden className="size-4" />
                {meta.label}
                <span className="font-medium text-[var(--text-muted)]">{visible.length < group.length ? t('reasons.countOf', { n: visible.length, total: group.length }) : group.length}</span>
              </h3>
              <ul className={cn('space-y-2', columns && 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-2.5 lg:space-y-0')}>
                {visible.map((r) => <li key={`${r.factor}-${r.title}`}><ReasonCard reason={r} max={max} /></li>)}
              </ul>
            </div>
          )
        })}
      </div>
      {collapsible && (
        <Button variant="secondary" size="sm" className="mt-4" aria-expanded={all} aria-controls={listId} onClick={() => setAll((v) => !v)}>
          {all ? <><ChevronsUp aria-hidden />{t('reasons.top', { n: initial })}</> : <><ChevronsDown aria-hidden />{t('reasons.all', { n: reasons.length })}</>}
        </Button>
      )}
    </section>
  )
}

function ReasonCard({ reason, max }: { reason: Reason; max: number }) {
  useT()
  const [open, setOpen] = useState(false)
  const meta = EFFECT_META[reason.effect]
  const tone = TONE_VARS[meta.tone]
  const Icon = factorIcon(reason.factor)
  const level = influence(reason.weight, max)
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="glass rounded-2xl transition-colors">
      <Collapsible.Trigger className="group flex w-full items-start gap-3 rounded-2xl p-3.5 text-left focus-visible:outline-offset-0 sm:p-4">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.border}` }}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug text-[var(--text)]">{reason.title}</span>
          <span className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-[var(--text-muted)]">
            <span className="sr-only">{meta.label}. </span>
            <span aria-hidden className="h-1 w-14 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(12, (reason.weight / max) * 100)}%`, background: tone.solid }} />
            </span>
            <span>{level}</span>
          </span>
        </span>
        <ChevronDown aria-hidden className="mt-1 size-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <p className="px-3.5 pb-3.5 pl-[3.75rem] text-sm leading-relaxed text-[var(--text-muted)] sm:px-4 sm:pb-4 sm:pl-[4rem]">
        <span className={cn(!open && 'line-clamp-2')}>{reason.text}</span>
      </p>
      <Collapsible.Content className="px-3.5 pb-3.5 pl-[3.75rem] sm:px-4 sm:pb-4 sm:pl-[4rem]">
        <p className="-mt-1 flex items-start gap-1.5 text-xs leading-snug text-[var(--text-muted)]">
          <BookOpen aria-hidden className="mt-px size-3.5 shrink-0" />
          <span><span className="sr-only">{t('common.source')}</span>{reason.source}</span>
        </p>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
