// Header control for the interface language: a menu of the languages in their own scripts, plus
// "Automatic" (follow the browser). The choice is saved with the other settings.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Check, Languages } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { LANG_INFO, LANGS, useT, type LanguagePreference } from '@/i18n'
import { updateSettings, useSettings } from '@/state/settings'
import { Tooltip } from '@/ui/components/Tooltip'

const itemClass =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-xl px-3 text-sm text-[var(--text)] outline-none data-[highlighted]:bg-[var(--hover)]'

export function LanguageMenu() {
  const { t, lang } = useT()
  const { language } = useSettings()
  const options: { value: LanguagePreference; label: string; note?: string }[] = [
    { value: 'auto', label: t('lang.auto'), note: LANG_INFO[lang].native },
    ...LANGS.map((l) => ({ value: l, label: LANG_INFO[l].native, note: l === 'en' ? undefined : LANG_INFO[l].english })),
  ]
  return (
    <DropdownMenu.Root>
      <Tooltip content={t('lang.label')}>
        <DropdownMenu.Trigger
          className="grid size-11 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] data-[state=open]:bg-[var(--hover)] [&_svg]:size-5"
          aria-label={`${t('lang.label')}: ${LANG_INFO[lang].native}`}
          data-testid="language-menu"
        >
          <Languages aria-hidden />
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} collisionPadding={12} className="pop glass z-50 w-60 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[var(--bg)] p-1.5">
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold text-[var(--text-muted)]">{t('lang.label')}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={language} onValueChange={(v) => updateSettings({ language: v as LanguagePreference })}>
            {options.map((o) => (
              <DropdownMenu.RadioItem key={o.value} value={o.value} className={itemClass} lang={o.value === 'auto' ? undefined : LANG_INFO[o.value].tag}>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{o.label}</span>
                  {o.note && <span className="block text-xs text-[var(--text-muted)]">{o.note}</span>}
                </span>
                <DropdownMenu.ItemIndicator><Check aria-hidden className="size-4 text-[var(--accent-text)]" /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
