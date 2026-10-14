// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Check, ChevronDown, HeartHandshake, Info, Settings, UserPlus, Users } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useLocation } from 'wouter'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { profileInitials, profileName, type Profile } from '@/state/profiles'

export function Avatar({ profile, className }: { profile: Profile; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#b4a5fb,#f8bd57)] text-[0.7rem] font-bold tracking-wide text-[#1a1330] shadow-inner',
        className,
      )}
    >
      {profileInitials(profile)}
    </span>
  )
}

const itemClass =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-3 text-sm text-[var(--text)] outline-none data-[highlighted]:bg-[var(--hover)] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[var(--text-muted)]'

export interface ProfileSwitcherProps {
  profiles: Profile[]
  active: Profile | undefined
  /** The forecast view to keep when switching ("today", "week", ...). */
  view: string
}

/** Choose whose chart the tabs show, add a profile, or reach settings. */
export function ProfileSwitcher({ profiles, active, view }: ProfileSwitcherProps) {
  const { t } = useT()
  const [, navigate] = useLocation()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex h-11 min-w-11 items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] pl-1.5 pr-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)] data-[state=open]:bg-[var(--hover)] sm:pr-3 md:max-lg:pr-1.5"
        aria-label={active ? t('menu.profileLabel', { name: profileName(active) }) : t('menu.profiles')}
      >
        {active ? <Avatar profile={active} /> : <Users className="mx-1.5 size-5" aria-hidden />}
        {/* Avatar only on narrow tablets, where the header also carries the forecast tabs. */}
        <span className="hidden max-w-36 truncate sm:block md:max-lg:hidden">{active ? profileName(active) : t('menu.profiles')}</span>
        <ChevronDown aria-hidden className="hidden size-4 text-[var(--text-muted)] sm:block md:max-lg:hidden" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="pop glass z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[var(--bg)] p-1.5"
        >
          {profiles.length > 0 && (
            <>
              <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{t('menu.profiles')}</DropdownMenu.Label>
              {profiles.map((p) => (
                <DropdownMenu.Item key={p.id} className={itemClass} onSelect={() => navigate(`/p/${p.id}/${view}`)}>
                  <Avatar profile={p} className="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{profileName(p)}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">{p.birth.place || p.birth.date}</span>
                  </span>
                  {p.id === active?.id && <Check aria-label={t('menu.current')} className="text-[var(--accent-text)]!" />}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="my-1.5 h-px bg-[var(--divider)]" />
            </>
          )}
          <DropdownMenu.Item className={itemClass} onSelect={() => navigate('/new')}>
            <UserPlus aria-hidden /> {t('menu.add')}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => navigate('/profiles')}>
            <Users aria-hidden /> {t('menu.manage')}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => navigate('/match')}>
            <HeartHandshake aria-hidden /> {t('menu.matching')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1.5 h-px bg-[var(--divider)]" />
          <DropdownMenu.Item className={itemClass} onSelect={() => navigate('/settings')}>
            <Settings aria-hidden /> {t('menu.settings')}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={() => navigate('/about')}>
            <Info aria-hidden /> {t('menu.about')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
