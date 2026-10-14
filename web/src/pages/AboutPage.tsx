// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { BookOpen, CodeXml, Compass, ExternalLink, Gauge, Languages, Scale, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { rich, useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { Button } from '@/ui/components/Button'
import { Callout } from '@/ui/components/Callout'
import { Card } from '@/ui/components/Card'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { AUTHOR_URL, COPYRIGHT, SOURCE_URL } from '@/ui/layout/Footer'
import { Page } from '@/ui/layout/Page'

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-[var(--accent-text)] underline decoration-[var(--accent-soft)] underline-offset-4 hover:decoration-current">
      {children}
    </a>
  )
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Card className="sm:p-8">
      <h2 className="flex items-center gap-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
        <span className="chip grid size-10 shrink-0 place-items-center rounded-xl">
          <Icon aria-hidden className="size-5" strokeWidth={1.8} />
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-[var(--text-muted)] [&_strong]:font-semibold [&_strong]:text-[var(--text)]">{children}</div>
    </Card>
  )
}

/** Where readers report a translation that reads wrongly (a new GitHub issue, prefilled). */
const TRANSLATION_ISSUE_URL = `${SOURCE_URL}/issues/new?labels=translation&title=${encodeURIComponent('Translation correction')}`

export default function AboutPage() {
  const { t, lang } = useT()
  useDocumentTitle(pageTitle(t('nav.about')))
  const strong = (key: Parameters<typeof t>[0]) => <strong>{t(key)}</strong>
  return (
    <Page width="narrow">
      <SectionHeader
        level={1}
        eyebrow={t('nav.about')}
        title="Jyotish Daily"
        description={t('about.description')}
      />

      <div className="mt-8 space-y-5">
        <Section icon={Compass} title={t('about.what')}>
          <p>{t('about.what1')}</p>
          <p>{t('about.what2')}</p>
        </Section>

        <Section icon={BookOpen} title={t('landing.methods')}>
          <ul className="list-disc space-y-2 pl-5 marker:text-[var(--accent-text)]">
            <li>{strong('about.astronomy')} {t('about.astronomyText')}</li>
            <li>{strong('about.rules')} {rich(t('about.rulesText'), { book: <cite>Vedic Astrology: An Integrated Approach</cite> })}</li>
            <li>{strong('about.guidance')} {t('about.guidanceText')}</li>
            <li>{strong('about.years')} {t('about.yearsText')}</li>
            <li>{strong('about.places')} {rich(t('about.placesText'), { geonames: <ExtLink href="https://www.geonames.org/">GeoNames</ExtLink> })}</li>
          </ul>
        </Section>

        <Section icon={Gauge} title={t('about.accuracy')}>
          <p>{t('about.accuracy1')}</p>
          <p>{strong('about.accuracyStrong')} {t('about.accuracy2')}</p>
        </Section>

        <Section icon={TriangleAlert} title={t('about.limits')}>
          <ul className="list-disc space-y-2 pl-5 marker:text-[var(--accent-text)]">
            <li>{t('about.limit1')}</li>
            <li>{t('about.limit2')}</li>
            <li>{t('about.limit3')}</li>
            <li>{t('about.limit4')}</li>
          </ul>
          <Callout tone="warning" className="mt-4">{t('common.disclaimer')}</Callout>
        </Section>

        <Section icon={Languages} title={t('about.languages')}>
          <p>{t('about.languagesText')}</p>
          <p data-testid="translation-note">
            <strong>{t('about.aiAssisted')}</strong>{' '}
            {lang === 'en' ? t('about.aiAssistedEn') : t('about.aiAssistedText')}{' '}
            <ExtLink href={TRANSLATION_ISSUE_URL}>{t('about.reportIssue')}</ExtLink>
          </p>
        </Section>

        <Section icon={Scale} title={t('about.licences')}>
          <ul className="list-disc space-y-2 pl-5 marker:text-[var(--accent-text)]">
            <li>
              {/* Appropriate Legal Notice and author attribution (AGPL section 5(d), NOTICE section 7(b)). */}
              <strong>Copyright {COPYRIGHT}</strong>. Originally created by Chethan (<ExtLink href={AUTHOR_URL}>@chethandvg</ExtLink>). See{' '}
              <ExtLink href={`${SOURCE_URL}/blob/main/NOTICE`}>NOTICE</ExtLink> and <ExtLink href={`${SOURCE_URL}/blob/main/LICENSE.txt`}>LICENSE</ExtLink>.
            </li>
            <li>
              {rich(t('about.licence1'), { licence: <ExtLink href="https://www.gnu.org/licenses/agpl-3.0.html">GNU Affero General Public License v3.0 or later</ExtLink> })}
            </li>
            <li>{t('about.licence2')}</li>
            <li>
              {rich(t('about.licence3'), {
                geonames: <ExtLink href="https://www.geonames.org/">GeoNames</ExtLink>,
                cc: <ExtLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExtLink>,
              })}
            </li>
            <li>{t('about.licence4')}</li>
            <li>{t('about.licence5')}</li>
          </ul>
        </Section>

        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
              <ShieldCheck aria-hidden className="size-5 text-[var(--good-fg)]" /> {t('about.readCode')}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t('about.readCodeText')}</p>
          </div>
          <Button asChild variant="secondary">
            <a href={SOURCE_URL} target="_blank" rel="noreferrer">
              <CodeXml aria-hidden /> {t('footer.source')} <ExternalLink aria-hidden />
            </a>
          </Button>
        </Card>
      </div>
    </Page>
  )
}
