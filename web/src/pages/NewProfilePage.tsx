// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Clock, Globe, History, MapPin, Pencil, ShieldCheck, UserRound, UserX, type LucideIcon } from 'lucide-react'
import { RadioGroup } from 'radix-ui'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { cityLabel, type City } from '@/lib/cities'
import { cn } from '@/lib/cn'
import { t, useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { getEngine } from '@/lib/engine'
import {
  checkBirth, formatOffset, lmtOffset, MAX_YEAR, MIN_YEAR, parseCoordinate, typedFixedOffset, type BirthField, type FoldOption,
} from '@/state/birth'
import { createProfile, profileName, setActiveProfile, updateProfile, useProfile, type Profile } from '@/state/profiles'
import { Badge } from '@/ui/components/Badge'
import { Button } from '@/ui/components/Button'
import { Callout } from '@/ui/components/Callout'
import { Card, CardTitle } from '@/ui/components/Card'
import { Disclosure } from '@/ui/components/Disclosure'
import { EmptyState } from '@/ui/components/EmptyState'
import { Field, Input } from '@/ui/components/Input'
import { PlaceSearch } from '@/ui/components/PlaceSearch'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { civilDate } from '@/ui/forecast/dates'
import { Page } from '@/ui/layout/Page'

interface FormState {
  name: string
  date: string
  time: string
  withSeconds: boolean
  place: string
  latitude: string
  longitude: string
  timeZone: string
  fold?: 0 | 1
}

const EMPTY: FormState = { name: '', date: '', time: '', withSeconds: false, place: '', latitude: '', longitude: '', timeZone: '' }

function fromProfile(p: Profile): FormState {
  const b = p.birth
  return {
    name: b.name ?? '', date: b.date, time: b.time, withSeconds: b.time.length === 8, place: b.place ?? '',
    latitude: String(b.latitude), longitude: String(b.longitude), timeZone: b.timeZone, fold: b.fold,
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "28 Apr 1990, 00:20 UTC"; seconds appear when a local-mean-time offset or seconds field produces them. */
function formatUtc(iso: string): string {
  const d = new Date(iso)
  const s = d.getUTCSeconds()
  const date = `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  return `${civilDate(date)}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}${s ? `:${pad2(s)}` : ''} UTC`
}

/** "28 Apr 1990, 05:50" from the form's civil date and time. */
function formatCivil(date: string, time: string): string {
  return `${civilDate(date)}, ${time}`
}

function formatCoordinates(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${t(lat >= 0 ? 'coord.n' : 'coord.s')}, ${Math.abs(lon).toFixed(4)}° ${t(lon >= 0 ? 'coord.e' : 'coord.w')}`
}

let zoneNames: string[] | null = null
// Suggestions for the time-zone field; older browsers lack supportedValuesOf.
const allZones = () => (zoneNames ??= typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [])

/** Create a profile at /new, or edit one at /p/:id/edit. */
export default function NewProfilePage() {
  const { id } = useParams<{ id?: string }>()
  const existing = useProfile(id)
  const { t } = useT()
  useDocumentTitle(pageTitle(!id ? t('profiles.new') : existing ? t('profiles.editAria', { name: profileName(existing) }) : t('profile.notFound')))
  // Start the engine while the form is filled in, so the forecast opens without waiting for it.
  useEffect(() => void getEngine().catch(() => {}), [])
  if (id && !existing) {
    return (
      <Page width="narrow">
        <EmptyState
          icon={UserX}
          title={t('profile.notFound')}
          description={t('form.notFoundText')}
          action={<Button asChild><Link href="/profiles">{t('form.seeProfiles')}</Link></Button>}
        />
      </Page>
    )
  }
  return <ProfileForm key={id ?? 'new'} existing={existing} />
}

function ProfileForm({ existing }: { existing?: Profile }) {
  const { lang } = useT()
  const [, navigate] = useLocation()
  const [form, setForm] = useState<FormState>(() => (existing ? fromProfile(existing) : EMPTY))
  const [touched, setTouched] = useState<Set<BirthField>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(() => !!existing && (!existing.birth.place || typedFixedOffset(existing.birth.timeZone) !== null))
  const searchWrap = useRef<HTMLDivElement>(null)

  const check = useMemo(
    () => checkBirth({
      name: form.name, date: form.date, time: form.time, timeZone: form.timeZone, fold: form.fold, place: form.place,
      latitude: parseCoordinate(form.latitude, 'latitude'), longitude: parseCoordinate(form.longitude, 'longitude'),
    }),
    // The messages are in the current language.
    [form, lang],
  )

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  // A different date or time is a different repeated hour (if any), so an earlier fold choice no longer applies.
  const setWallClock = (key: 'date' | 'time', value: string) => setForm((f) => ({ ...f, [key]: value, fold: undefined }))
  const touch = (field: BirthField) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)))
  const errorFor = (field: BirthField) => (submitted || touched.has(field) ? check.errors[field] : undefined)

  function chooseCity(city: City) {
    setForm((f) => ({
      ...f, place: cityLabel(city), latitude: String(city.latitude), longitude: String(city.longitude), timeZone: city.timeZone, fold: undefined,
    }))
  }

  function enterManually() {
    setAdvancedOpen(true)
    requestAnimationFrame(() => document.getElementById('latitude')?.focus())
  }

  function clearPlace() {
    setForm((f) => ({ ...f, place: '', latitude: '', longitude: '', timeZone: '', fold: undefined }))
    requestAnimationFrame(() => searchWrap.current?.querySelector('input')?.focus())
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!check.birth) {
      // Reveal problems inside the collapsed Advanced section, then move focus
      // to the first problem so keyboard and screen-reader users land on it.
      if (check.errors.latitude || check.errors.longitude || check.errors.timeZone) setAdvancedOpen(true)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [data-fold-choice] [role=radio]')?.focus())
      return
    }
    const profile = existing ? updateProfile(existing.id, check.birth) : createProfile(check.birth)
    if (!profile) return
    setActiveProfile(profile.id)
    navigate(`/p/${profile.id}/today`)
  }

  const lat = parseCoordinate(form.latitude, 'latitude'), lon = parseCoordinate(form.longitude, 'longitude')
  const hasCoordinates = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon)
  const placeChosen = form.place !== '' && hasCoordinates
  const isFixedZone = form.timeZone !== '' && typedFixedOffset(form.timeZone) !== null

  return (
    <Page>
      <SectionHeader
        level={1}
        eyebrow={existing ? t('form.editEyebrow') : t('profiles.new')}
        title={existing ? t('form.editTitle') : t('form.newTitle')}
        description={t('form.description')}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <form noValidate onSubmit={onSubmit} className="glass rounded-[var(--radius-card)] p-5 sm:p-8" aria-label={t('chartPage.details')}>
          <FormSection icon={UserRound} title={t('form.who')}>
            <Field id="name" label={t('field.name')} error={errorFor('name')} hint={t('form.nameHint')}>
              {(c) => (
                <Input {...c} value={form.name} autoComplete="off" maxLength={60} placeholder={t('form.namePlaceholder')} onChange={(e) => set('name', e.target.value)} onBlur={() => touch('name')} />
              )}
            </Field>
          </FormSection>

          <FormSection icon={Clock} title={t('form.when')}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="date" label={t('field.date')} error={errorFor('date')}>
                {(c) => (
                  <Input {...c} type="date" min={`${MIN_YEAR}-01-01`} max={`${MAX_YEAR}-12-31`} value={form.date} onChange={(e) => setWallClock('date', e.target.value)} onBlur={() => touch('date')} />
                )}
              </Field>
              <div className="relative">
                <Field id="time" label={t('form.localTime')} error={errorFor('time')} hint={t('form.timeHint')}>
                  {(c) => (
                    <Input {...c} type="time" step={form.withSeconds ? 1 : 60} value={form.time} onChange={(e) => setWallClock('time', e.target.value)} onBlur={() => touch('time')} />
                  )}
                </Field>
                <button
                  type="button"
                  className="absolute -top-2 right-0 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--accent-text)] underline-offset-4 hover:underline"
                  onClick={() => setForm((f) => ({ ...f, withSeconds: !f.withSeconds, time: f.withSeconds ? f.time.slice(0, 5) : f.time }))}
                >
                  {form.withSeconds ? t('form.hideSeconds') : t('form.addSeconds')}
                </button>
              </div>
            </div>
          </FormSection>

          <FormSection icon={MapPin} title={t('form.where')} last>
            {placeChosen ? (
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3.5">
                <span className="chip hidden size-10 shrink-0 place-items-center rounded-xl sm:grid">
                  <MapPin aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug" data-testid="chosen-place">{form.place}</p>
                  <p className="mt-0.5 text-[0.8rem] text-[var(--text-muted)]">{formatCoordinates(lat!, lon!)} · {form.timeZone}</p>
                </div>
                <Button variant="ghost" size="sm" className="-my-1 -mr-1 h-11 px-3 sm:h-9" onClick={clearPlace} aria-label={t('form.changePlace')}>
                  <Pencil aria-hidden /> <span className="max-sm:sr-only">{t('form.change')}</span>
                </Button>
              </div>
            ) : (
              <div ref={searchWrap}>
                <Field id="place" label={t('place.town')} error={submitted ? check.errors.place : undefined} hint={t('form.placeHint')}>
                  {(c) => <PlaceSearch {...c} onSelect={chooseCity} onManualEntry={enterManually} />}
                </Field>
              </div>
            )}

            {/* The live region stays mounted so the offset is announced when it first resolves. */}
            <div aria-live="polite">
              {check.offsetMinutes !== null && (
                <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                  <Badge tone="accent" size="md" data-testid="birth-offset">
                    <Globe aria-hidden /> {t('form.atBirth', { offset: formatOffset(check.offsetMinutes) })}
                  </Badge>
                  {check.utc && <span>{t('form.universal')} {formatUtc(check.utc)}</span>}
                </p>
              )}
            </div>

            {check.foldOptions && (
              <FoldChoice
                options={check.foldOptions}
                time={form.time}
                value={form.fold}
                onChange={(fold) => set('fold', fold)}
                error={submitted ? check.errors.fold : undefined}
              />
            )}

            {check.notes.map((note) => (
              <Callout key={note} tone="warning" className="mt-4">{note}</Callout>
            ))}

            <Disclosure
              className="mt-4 border-t border-[var(--divider)] pt-2"
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
              title={<span>{t('form.advanced')}</span>}
            >
              <div className="grid gap-5 pb-1 pt-3 sm:grid-cols-2">
                <Field id="latitude" label={t('form.latitude')} error={errorFor('latitude')} hint={t('form.latHint')}>
                  {(c) => <Input {...c} autoComplete="off" spellCheck={false} value={form.latitude} placeholder="12.2979" onChange={(e) => set('latitude', e.target.value)} onBlur={() => touch('latitude')} />}
                </Field>
                <Field id="longitude" label={t('form.longitude')} error={errorFor('longitude')} hint={t('form.lonHint')}>
                  {(c) => <Input {...c} autoComplete="off" spellCheck={false} value={form.longitude} placeholder="76.6393" onChange={(e) => set('longitude', e.target.value)} onBlur={() => touch('longitude')} />}
                </Field>
                <Field
                  id="timeZone"
                  className="sm:col-span-2"
                  label={t('field.timeZone')}
                  error={errorFor('timeZone')}
                  hint={t('form.zoneHint')}
                >
                  {(c) => (
                    <>
                      <Input {...c} list="zone-list" autoComplete="off" spellCheck={false} value={form.timeZone} placeholder="Asia/Kolkata" onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value, fold: undefined }))} onBlur={() => touch('timeZone')} />
                      {advancedOpen && <datalist id="zone-list">{allZones().map((z) => <option key={z} value={z} />)}</datalist>}
                    </>
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-11 sm:h-9"
                    disabled={lon === null || !Number.isFinite(lon) || Math.abs(lon) > 180}
                    onClick={() => setForm((f) => ({ ...f, timeZone: lmtOffset(lon!), fold: undefined }))}
                  >
                    {t('form.lmt')}{lon !== null && Number.isFinite(lon) && Math.abs(lon) <= 180 ? ` (${lmtOffset(lon)})` : ''}
                  </Button>
                  <p className="mt-2 text-[0.8rem] leading-snug text-[var(--text-muted)]">
                    {t('form.lmtText')}
                  </p>
                </div>
                <Field id="placeLabel" className="sm:col-span-2" label={t('form.placeLabel')} optional hint={t('form.placeLabelHint')}>
                  {(c) => <Input {...c} value={form.place} maxLength={120} onChange={(e) => set('place', e.target.value)} />}
                </Field>
              </div>
            </Disclosure>
            {isFixedZone && !advancedOpen && (
              <p className="mt-1 text-[0.8rem] text-[var(--text-muted)]">{t('form.fixedOffset', { zone: form.timeZone })}</p>
            )}
          </FormSection>

          {submitted && !check.birth && (
            <Callout tone="error" className="mt-6">{t('form.needsAttention')}</Callout>
          )}

          {/* Save comes first in the DOM so tab order matches the stacked phone layout; row-reverse puts it on the right. */}
          <div className="mt-8 flex flex-col gap-3 border-t border-[var(--divider)] pt-6 sm:flex-row-reverse sm:items-center sm:justify-start">
            <Button type="submit" size="lg">
              {existing ? t('form.save') : t('form.saveNew')}
            </Button>
            <Button variant="ghost" asChild>
              <Link href={existing ? '/profiles' : '/'}>{t('common.cancel')}</Link>
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label={t('form.summary')}>
          <Summary className="hidden lg:block" form={form} offsetMinutes={check.offsetMinutes} utc={check.utc} hasCoordinates={hasCoordinates} lat={lat} lon={lon} />
          <Card className="p-5">
            <p className="flex items-start gap-3 text-sm leading-relaxed text-[var(--text-muted)]">
              <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--good-fg)]" />
              <span>
                <span className="font-semibold text-[var(--text)]">{t('form.private')}</span> {t('form.privateText')}
              </span>
            </p>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

function FormSection({ icon: Icon, title, last, children }: { icon: LucideIcon; title: string; last?: boolean; children: ReactNode }) {
  return (
    <fieldset className={cn('min-w-0', !last && 'mb-8 border-b border-[var(--divider)] pb-8')}>
      <legend className="mb-5 flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
        <span className="chip grid size-8 place-items-center rounded-lg">
          <Icon aria-hidden className="size-4" />
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

interface FoldChoiceProps {
  options: readonly [FoldOption, FoldOption]
  time: string
  value: 0 | 1 | undefined
  onChange: (fold: 0 | 1) => void
  error?: string
}

/**
 * Which reading of a repeated wall time was meant. Each option is a full-width
 * card (stacked on phones) giving the offset and the UTC instant, since
 * "first" and "second" alone are hard to check against a birth record.
 */
function FoldChoice({ options, time, value, onChange, error }: FoldChoiceProps) {
  const { t } = useT()
  return (
    <div className="mt-4 rounded-2xl border border-[var(--mixed-border)] bg-[var(--surface-2)] p-3 sm:p-4">
      <p id="fold-label" className="flex gap-2.5 text-sm leading-relaxed">
        <History aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--mixed-fg)]" />
        <span>
          <span className="font-semibold">{t('form.twice')}</span>{' '}
          <span className="text-[var(--text-muted)]">{t('form.twiceText', { time })}</span>
        </span>
      </p>
      <RadioGroup.Root
        data-fold-choice
        aria-labelledby="fold-label"
        aria-describedby={error ? 'fold-error' : undefined}
        value={value === undefined ? '' : String(value)}
        onValueChange={(v) => onChange(v === '1' ? 1 : 0)}
        className="mt-3 grid gap-2 sm:grid-cols-2"
      >
        {options.map((o) => (
          <RadioGroup.Item
            key={o.fold}
            value={String(o.fold)}
            className="group flex min-w-0 items-start gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--input-bg)] p-3 text-left transition-colors hover:border-[var(--text-muted)] data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--selected-bg)]"
          >
            <span aria-hidden className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 border-[var(--input-border)] group-data-[state=checked]:border-[var(--accent)]">
              <RadioGroup.Indicator className="size-1.5 rounded-full bg-[var(--accent)]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {t(o.fold === 0 ? 'form.first' : 'form.second', { time })} <span className="whitespace-nowrap font-medium text-[var(--text-muted)]">({formatOffset(o.offsetMinutes)})</span>
              </span>
              <span className="mt-0.5 block text-[0.8rem] leading-snug text-[var(--text-muted)]">
                {t(o.fold === 0 ? 'form.before' : 'form.after')}
                <span className="block">{formatUtc(o.utc)}</span>
              </span>
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {error && <p id="fold-error" className="mt-2 text-[0.8rem] text-[var(--bad-fg)]">{t('form.chooseFold')}</p>}
    </div>
  )
}

interface SummaryProps {
  className?: string
  form: FormState
  offsetMinutes: number | null
  utc: string | null
  hasCoordinates: boolean
  lat: number | null
  lon: number | null
}

function Summary({ className, form, offsetMinutes, utc, hasCoordinates, lat, lon }: SummaryProps) {
  const { t } = useT()
  const rows: [string, ReactNode][] = [
    [t('field.name'), form.name.trim() || null],
    [t('form.born'), form.date && form.time ? t('form.localTimeValue', { value: formatCivil(form.date, form.time) }) : null],
    [t('field.place'), form.place || null],
    [t('field.coordinates'), hasCoordinates ? formatCoordinates(lat!, lon!) : null],
    [t('field.timeZone'), form.timeZone || null],
    [t('form.offset'), offsetMinutes !== null ? formatOffset(offsetMinutes) : null],
    [t('form.universal'), utc ? formatUtc(utc) : null],
  ]
  return (
    <Card className={cn('p-5', className)}>
      <CardTitle className="text-base">{t('form.summary')}</CardTitle>
      <dl className="mt-3 divide-y divide-[var(--divider)] text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-[var(--text-muted)]">{label}</dt>
            <dd className={cn('min-w-0 break-words text-right', value ? 'font-medium' : 'text-[var(--text-muted)]')}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
