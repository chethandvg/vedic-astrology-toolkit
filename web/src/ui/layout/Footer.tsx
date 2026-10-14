// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CodeXml, ShieldCheck } from 'lucide-react'
import { Link } from 'wouter'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { LogoMark, Wordmark } from '@/ui/components/Logo'

export const SOURCE_URL = 'https://github.com/chethandvg/vedic-astrology-toolkit'
/** Author attribution required by the AGPL section 7 terms in NOTICE; keep it in modified versions. */
export const AUTHOR_URL = 'https://github.com/chethandvg'
export const COPYRIGHT = '© 2026 Chethan'

const linkClass = 'inline-flex min-h-11 items-center rounded-lg text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)] md:min-h-9'

export function Footer({ className }: { className?: string }) {
  const { t } = useT()
  return (
    <footer className={cn('mt-8 border-t border-[var(--divider)]', className)}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_0.8fr_1.4fr] md:gap-10">
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl" aria-label={t('nav.home')}>
            <LogoMark className="size-8" />
            <Wordmark />
          </Link>
          <p className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--good-fg)]" />
            {t('footer.private')}
          </p>
        </div>
        <nav aria-label={t('footer.label')} className="grid grid-cols-2 gap-x-6 md:grid-cols-1 md:gap-0">
          <Link href="/about" className={linkClass}>{t('footer.about')}</Link>
          <Link href="/settings" className={linkClass}>{t('menu.settings')}</Link>
          <Link href="/profiles" className={linkClass}>{t('menu.profiles')}</Link>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={linkClass}>{t('footer.source')}</a>
        </nav>
        <div className="space-y-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
          <p>{t('common.disclaimer')}</p>
          <p className="flex items-center gap-1.5">
            <CodeXml aria-hidden className="size-4 shrink-0" />
            <span>
              <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{COPYRIGHT}</a> · {t('footer.licence')}
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}
