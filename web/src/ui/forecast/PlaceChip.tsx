// "Timings for Bengaluru": opens a sheet to choose the town the user is in today, since
// sunrise, Rahu Kalam, choghadiya and horas depend on the local sunrise.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { House, MapPin } from 'lucide-react'
import { useState } from 'react'
import { rich, useT } from '@/i18n'
import { cityLabel } from '@/lib/cities'
import { useActiveProfile, type Profile } from '@/state/profiles'
import { Button } from '@/ui/components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/ui/components/Dialog'
import { Label } from '@/ui/components/Input'
import { PlaceSearch } from '@/ui/components/PlaceSearch'
import { birthPlace, shortPlaceName, useTimingsPlace } from './data'

/** `profile` is the one on screen: its birthplace is the default and the way back. */
export function PlaceChip({ profile, className }: { profile?: Profile; className?: string }) {
  const { t } = useT()
  const { place, isDefault, setPlace } = useTimingsPlace(profile)
  const active = useActiveProfile()
  const shown = profile ?? active
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className={className} aria-label={t('place.chipAria', { name: place.name })}>
          <MapPin aria-hidden className="text-[var(--accent-text)]" />
          <span className="max-w-[9rem] truncate">{shortPlaceName(place)}</span>
        </Button>
      </DialogTrigger>
      {/* Tall enough for the suggestion list, which opens over the lines below the field. */}
      <DialogContent variant="sheet" className="min-h-[75dvh] sm:min-h-[30rem]">
        <DialogTitle>{t('place.whereTitle')}</DialogTitle>
        <DialogDescription>
          {t('place.whereText')}
        </DialogDescription>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="timings-place">{t('place.town')}</Label>
          <PlaceSearch
            id="timings-place"
            placeholder={t('place.placeholderNow')}
            onSelect={(city) => {
              setPlace({ name: cityLabel(city), latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone })
              setOpen(false)
            }}
          />
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-sm ring-1 ring-inset ring-[var(--surface-border)]">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--accent-text)]" />
          <span className="text-[var(--text-muted)]">{rich(t('place.showing'), { name: <span className="font-medium text-[var(--text)]">{place.name}</span> })} · {place.timeZone}</span>
        </p>
        {!isDefault && shown && (
          <Button
            variant="ghost" className="mt-3 w-full sm:w-auto"
            onClick={() => {
              setPlace(null)
              setOpen(false)
            }}
          >
            <House aria-hidden /> {t('place.useBirth', { name: shortPlaceName(birthPlace(shown.birth)) })}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
