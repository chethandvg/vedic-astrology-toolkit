// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '@/i18n'
import { cityRegion, loadCities, type City, type CityIndex } from '@/lib/cities'
import { cn } from '@/lib/cn'
import { inputClass } from './Input'
import { Spinner } from './Spinner'

export interface PlaceSearchProps {
  id: string
  onSelect: (city: City) => void
  /** Offered when nothing matches or the list fails to load: switch to typing coordinates. */
  onManualEntry?: () => void
  placeholder?: string
  autoFocus?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Type-ahead birthplace search (ARIA 1.2 combobox with a listbox popup). The
 * city table loads on first focus; arrows move, Enter picks, Escape closes.
 */
export function PlaceSearch({ id, onSelect, onManualEntry, placeholder, autoFocus, ...aria }: PlaceSearchProps) {
  const { t, tp } = useT()
  const listId = useId()
  const [index, setIndex] = useState<CityIndex | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => (index && query.trim() ? index.search(query, 8) : []), [index, query])

  // On phones the on-screen keyboard covers the lower half of the screen, so
  // lift the field towards the top (below the sticky header, via scroll-margin)
  // to leave room for the suggestions underneath it.
  function revealOnPhone() {
    if (!window.matchMedia('(max-width: 767px)').matches) return
    const field = wrapRef.current
    if (field && field.getBoundingClientRect().top > window.innerHeight * 0.3) {
      setTimeout(() => field.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 50)
    }
  }

  function ensureLoaded() {
    if (status === 'loading' || status === 'ready') return
    setStatus('loading')
    loadCities().then(
      (loaded) => {
        setIndex(loaded)
        setStatus('ready')
      },
      () => setStatus('error'),
    )
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function choose(city: City) {
    onSelect(city)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (results.length) setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length)
    } else if (e.key === 'Enter') {
      // Enter belongs to the search while it has text: it picks the highlighted
      // place, or reopens the list, but never submits the surrounding form.
      if (!query.trim()) return
      e.preventDefault()
      if (open && results[active]) choose(results[active].city)
      else setOpen(true)
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        setOpen(false)
      } else setQuery('')
    } else if (e.key === 'Home' || e.key === 'End') {
      if (open && results.length) {
        e.preventDefault()
        setActive(e.key === 'Home' ? 0 : results.length - 1)
      }
    }
  }

  // A pointer shortcut out of a dead end; keyboard users reach the same fields
  // with Tab, so the button stays out of the tab order and focus stays here.
  const manualAction = onManualEntry && (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        setOpen(false)
        onManualEntry()
      }}
      className="mt-1 flex min-h-11 items-center gap-2 rounded-lg font-medium text-[var(--accent-text)] hover:underline hover:underline-offset-4"
    >
      <LocateFixed aria-hidden className="size-4" /> {t('place.manual')}
    </button>
  )

  const showList = open && query.trim() !== ''
  const activeId = showList && results[active] ? `${listId}-${active}` : undefined
  const announcement = status === 'ready' && query.trim()
    ? results.length ? tp('place.found', results.length) : t('place.none')
    : ''

  return (
    <div ref={wrapRef} className="relative scroll-mt-28">
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={activeId}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        autoFocus={autoFocus}
        placeholder={placeholder ?? t('place.placeholder')}
        className={cn(inputClass, 'pl-10 pr-10')}
        value={query}
        onFocus={() => {
          ensureLoaded()
          revealOnPhone()
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
          ensureLoaded()
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...aria}
      />
      {status === 'loading' && <span className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner className="size-4" label={t('place.loading')} /></span>}
      <span className="sr-only" aria-live="polite">{announcement}</span>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={t('place.list')}
        hidden={!showList}
        className="glass absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-[var(--bg)] p-1.5"
      >
        {results.map(({ city, via }, i) => (
          <li
            key={`${city.name}-${city.latitude}-${city.longitude}`}
            id={`${listId}-${i}`}
            data-index={i}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => setActive(i)}
            onClick={() => choose(city)}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
              i === active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--hover)]',
            )}
          >
            <MapPin aria-hidden className={cn('size-4 shrink-0', i === active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[var(--text)]">
                {city.name}
                {via && <span className="font-normal text-[var(--text-muted)]"> · {t('place.also', { name: via })}</span>}
              </span>
              <span className="block truncate text-[0.8rem] text-[var(--text-muted)]">
                {cityRegion(city)}
              </span>
            </span>
            <span className="hidden shrink-0 text-xs text-[var(--text-muted)] sm:block">{city.timeZone}</span>
          </li>
        ))}
        {status === 'ready' && results.length === 0 && (
          <li role="presentation" className="px-3 py-3 text-sm text-[var(--text-muted)]">
            {t('place.noMatch')}
            {manualAction}
          </li>
        )}
        {status === 'loading' && <li role="presentation" className="px-3 py-3 text-sm text-[var(--text-muted)]">{t('place.loading')}…</li>}
        {status === 'error' && (
          <li role="presentation" className="px-3 py-3 text-sm text-[var(--bad-fg)]">
            {t('place.error')}
            {manualAction}
          </li>
        )}
      </ul>
    </div>
  )
}
