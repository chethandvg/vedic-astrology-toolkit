// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useT } from '@/i18n'
import { resolveTheme, updateSettings, useSettings } from '@/state/settings'
import { Button } from '@/ui/components/Button'
import { Tooltip } from '@/ui/components/Tooltip'

/** Flip between the dark and light themes (an explicit choice replaces 'system'). */
export function ThemeToggle() {
  const { theme } = useSettings()
  const { t } = useT()
  const current = resolveTheme(theme)
  const next = current === 'dark' ? 'light' : 'dark'
  const label = t(next === 'dark' ? 'theme.toDark' : 'theme.toLight')
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon" aria-label={label} onClick={() => updateSettings({ theme: next })}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current}
            initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            className="grid place-items-center"
          >
            {current === 'dark' ? <Moon /> : <Sun />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tooltip>
  )
}
