// Choose the two saved profiles to match, in the groom's and the bride's roles, with a swap and a
// link to add a partner through the usual new-profile form.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { ArrowLeftRight, UserPlus } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'wouter'
import { useT } from '@/i18n'
import { profileName, type Profile } from '@/state/profiles'
import { civilDate } from '@/ui/forecast/dates'
import { Button } from '@/ui/components/Button'
import { Label } from '@/ui/components/Input'
import { Select } from '@/ui/components/Select'
import { Tooltip } from '@/ui/components/Tooltip'
import type { MatchPair } from './useMatch'

const born = (p: Profile) => civilDate(p.birth.date)

function ProfileSelect({ label, value, profiles, onChange }: { label: string; value?: Profile; profiles: Profile[]; onChange(id: string): void }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value?.id ?? ''} onChange={(e) => onChange(e.target.value)}>
        {profiles.map((p) => <option key={p.id} value={p.id}>{profileName(p)} · {born(p)}</option>)}
      </Select>
    </div>
  )
}

/** Choosing a profile already in the other role swaps the two. */
export function PairPicker({ profiles, groom, bride, onChange }: { profiles: Profile[]; groom?: Profile; bride?: Profile; onChange(next: MatchPair): void }) {
  const { t } = useT()
  const pair = { groomId: groom?.id ?? null, brideId: bride?.id ?? null }
  return (
    <div>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <ProfileSelect label={t('match.groom')} value={groom} profiles={profiles} onChange={(groomId) => onChange({ groomId, brideId: groomId === pair.brideId ? pair.groomId : pair.brideId })} />
        <Tooltip content={t('match.swap')}>
          <Button variant="secondary" size="icon" aria-label={t('match.swapAria')} className="justify-self-center" onClick={() => onChange({ groomId: pair.brideId, brideId: pair.groomId })}>
            <ArrowLeftRight aria-hidden className="max-sm:rotate-90" />
          </Button>
        </Tooltip>
        <ProfileSelect label={t('match.bride')} value={bride} profiles={profiles} onChange={(brideId) => onChange({ brideId, groomId: brideId === pair.groomId ? pair.brideId : pair.groomId })} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--divider)] pt-4">
        <p className="max-w-xl text-[0.8rem] leading-snug text-[var(--text-muted)]">
          {t('match.swapNote')}
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/new"><UserPlus aria-hidden /> {t('match.addPartner')}</Link>
        </Button>
      </div>
    </div>
  )
}
