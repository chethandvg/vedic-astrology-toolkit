// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import {
  ArrowRight, CalendarRange, ChevronRight, CodeXml, Cpu, LayoutGrid, Lock, MapPin, ShieldCheck, Sparkles, Sunrise, UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, type RefObject } from 'react'
import { Link } from 'wouter'
import { rich, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { useDocumentTitle } from '@/lib/documentTitle'
import { profileName, useActiveProfile, useProfiles, type Profile } from '@/state/profiles'
import { Badge } from '@/ui/components/Badge'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { RatingPill } from '@/ui/components/RatingPill'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { ZodiacWheel } from '@/ui/components/ZodiacWheel'
import { Avatar } from '@/ui/layout/ProfileSwitcher'

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
}

export default function LandingPage() {
  const { t } = useT()
  useDocumentTitle(t('app.homeTitle'))
  const profiles = useProfiles()
  const active = useActiveProfile()
  const howRef = useRef<HTMLElement>(null)
  return (
    <>
      {profiles.length > 0 && <WelcomeBack profiles={profiles} />}
      <Hero active={active} onHowItWorks={() => howRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })} />
      <Features />
      <HowItWorks sectionRef={howRef} />
      <Trust />
      <FinalCta />
    </>
  )
}

/** Returning visitors get their own day as the main action; newcomers are invited to create a chart. */
function Hero({ active, onHowItWorks }: { active: Profile | undefined; onHowItWorks: () => void }) {
  const { t } = useT()
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:pb-16 lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
          <Badge tone="accent" size="md">
            <Sparkles aria-hidden /> {t('landing.badge')}
          </Badge>
          <h1 className="mt-5 text-balance font-display text-[2.7rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.4rem]">
            {rich(t('landing.title'), { em: <em className="text-gradient pr-1 font-medium italic">{t('landing.titleEm')}</em> })}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[var(--text-muted)] sm:text-xl">
            {t('landing.lead')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild className="px-5 sm:px-7">
              <Link href={active ? `/p/${active.id}/today` : '/new'}>
                {active ? t('landing.seeToday') : t('landing.create')} <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" className="px-5 sm:px-7" onClick={onHowItWorks}>
              {t('landing.how')}
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-muted)]">
            {([[Lock, t('landing.noAccount')], [ShieldCheck, t('landing.noUpload')], [CodeXml, t('landing.openSource')]] as const).map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-2">
                <Icon aria-hidden className="size-4 text-[var(--accent-text)]" />
                {text}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="relative mx-auto w-full max-w-[30rem] pb-24 sm:pb-6 lg:max-w-[34rem] lg:pb-0"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
        >
          <ZodiacWheel className="w-full" />
          <SampleDay className="float absolute bottom-0 left-0 w-[15.5rem] sm:-left-4 sm:w-64 lg:-left-10 lg:bottom-8" />
          <SampleDasha className="float absolute right-0 top-2 hidden [animation-delay:-3s] min-[420px]:block lg:-right-2" />
        </motion.div>
      </div>
    </section>
  )
}

function SampleTag() {
  const { t } = useT()
  return <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('common.sample')}</span>
}

function SampleDay({ className }: { className?: string }) {
  const { t, n } = useT()
  return (
    <div className={cn('glass rounded-2xl p-4 shadow-[var(--shadow-glow)]', className)} aria-label={t('landing.sampleDay')} role="group">
      <div className="flex items-center justify-between gap-2">
        <SampleTag />
        <RatingPill rating="favourable" size="sm" />
      </div>
      <p className="mt-2 font-display text-base font-semibold">{t('landing.sampleDate')}</p>
      <dl className="mt-3 space-y-1.5 text-[0.8rem]">
        {[
          [n.body.Moon, t('landing.sampleMoon')],
          [n.window['Rahu Kalam'], '13:30 – 15:00'],
          [n.window['Abhijit Muhurta'], '11:36 – 12:24'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-[var(--text-muted)]">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SampleDasha({ className }: { className?: string }) {
  const { t, n } = useT()
  return (
    <div className={cn('glass w-48 rounded-2xl p-3.5', className)} aria-label={t('landing.sampleDasha')} role="group">
      <SampleTag />
      <p className="mt-1 text-sm font-semibold">{n.body.Jupiter} · {n.body.Venus}</p>
      <p className="text-xs text-[var(--text-muted)]">{t('landing.sampleUntil')}</p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full w-[62%] rounded-full bg-[linear-gradient(90deg,#c4b5fd,#f8bd57)]" />
      </div>
    </div>
  )
}

function WelcomeBack({ profiles }: { profiles: Profile[] }) {
  const { t } = useT()
  return (
    <section aria-labelledby="welcome-title" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <h2 id="welcome-title" className="shrink-0 font-display text-lg font-semibold sm:pl-1">{t('landing.welcome')}</h2>
        <ul className="flex flex-1 flex-wrap gap-2">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.id}/today`}
                className="group flex min-h-11 items-center gap-2.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors hover:bg-[var(--hover)]"
              >
                <Avatar profile={p} />
                <span className="max-w-40 truncate">{profileName(p)}</span>
                <ChevronRight aria-hidden className="size-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
          <li>
            <Link href="/new" className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[var(--accent-text)] hover:bg-[var(--hover)]">
              <UserPlus aria-hidden className="size-4" /> {t('landing.addSomeone')}
            </Link>
          </li>
        </ul>
      </Card>
    </section>
  )
}

const FEATURES: { icon: LucideIcon; key: 'daily' | 'timeline' | 'charts' | 'private' }[] = [
  { icon: Sunrise, key: 'daily' },
  { icon: CalendarRange, key: 'timeline' },
  { icon: LayoutGrid, key: 'charts' },
  { icon: ShieldCheck, key: 'private' },
]

function Features() {
  const { t } = useT()
  return (
    <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader
        id="features-title"
        eyebrow={t('landing.featuresEyebrow')}
        title={t('landing.featuresTitle')}
        description={t('landing.featuresText')}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, key }, i) => (
          <motion.div key={key} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
            <Card className="flex h-full gap-4 sm:block">
              <span className="chip grid size-11 shrink-0 place-items-center rounded-xl">
                <Icon aria-hidden className="size-5" strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight sm:mt-4">{t(`landing.feature.${key}`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)] sm:mt-2">{t(`landing.feature.${key}.text`)}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const STEPS: { icon: LucideIcon; key: 1 | 2 | 3 }[] = [
  { icon: MapPin, key: 1 },
  { icon: Cpu, key: 2 },
  { icon: Sparkles, key: 3 },
]

function HowItWorks({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const { t } = useT()
  return (
    <section ref={sectionRef} aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeader id="how-title" eyebrow={t('landing.how')} title={t('landing.howTitle')} align="center" />
      <div className="relative mt-10">
        <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-40 md:block" />
        <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ icon: Icon, key }, i) => (
          <motion.li key={key} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-[var(--surface-border)] bg-[var(--bg)] text-[var(--accent-text)] shadow-[var(--shadow-glow)]">
              <Icon aria-hidden className="size-6" strokeWidth={1.7} />
              <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--btn-primary-fg)]">{i + 1}</span>
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight md:mt-2">{t(`landing.step${key}`)}</h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-[var(--text-muted)]">{t(`landing.step${key}.text`)}</p>
            </div>
          </motion.li>
        ))}
        </ol>
      </div>
    </section>
  )
}

const STATS = [
  { value: '9', key: 'decimals' },
  { value: '64', key: 'charts' },
  { value: '0', key: 'uploads' },
] as const

function Trust() {
  const { t } = useT()
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <motion.div {...reveal}>
        <Card className="relative overflow-hidden p-6 sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_70%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">{t('landing.trustEyebrow')}</p>
              <h2 id="trust-title" className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {t('landing.trustTitle')}
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-[var(--text-muted)]">
                {rich(t('landing.trustText'), { book: <cite>Vedic Astrology: An Integrated Approach</cite> })}
              </p>
              <Link href="/about" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--accent-text)] hover:underline hover:underline-offset-4">
                {t('landing.methods')} <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {STATS.map((s) => (
                <li key={s.key} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold text-[var(--accent-text)]">{s.value}</span>
                    <span className="text-sm font-medium">{t(`landing.stat.${s.key}`)}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{t(`landing.stat.${s.key}.text`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </motion.div>
    </section>
  )
}

function FinalCta() {
  const { t } = useT()
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <motion.div {...reveal} className="flex flex-col items-center text-center">
        <h2 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.ctaTitle')}</h2>
        <p className="mt-3 max-w-md text-[var(--text-muted)]">{t('landing.ctaText')}</p>
        <Button size="lg" asChild className="mt-7">
          <Link href="/new">
            {t('landing.create')} <ArrowRight aria-hidden />
          </Link>
        </Button>
      </motion.div>
    </section>
  )
}
