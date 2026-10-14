// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { BookOpen, Monitor, Moon, RotateCcw, SlidersHorizontal, Sparkles, Sun, Trash } from 'lucide-react'
import { LANG_INFO, LANGS, useT, type LanguagePreference } from '@/i18n'
import { RadioGroup } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { deleteAllProfiles, useProfiles } from '@/state/profiles'
import {
  AYANAMSA_OPTIONS, NODE_OPTIONS, resetSettings, updateSettings, useSettings, YEAR_MODEL_OPTIONS,
  type ChartStyle, type PresetName,
} from '@/state/settings'
import { Button } from '@/ui/components/Button'
import { Card } from '@/ui/components/Card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/ui/components/Dialog'
import { Label } from '@/ui/components/Input'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Select } from '@/ui/components/Select'
import { Page } from '@/ui/layout/Page'


export default function SettingsPage() {
  const { t, lang } = useT()
  useDocumentTitle(pageTitle(t('menu.settings')))
  const s = useSettings()
  const profiles = useProfiles()
  const ayanamsaNote = t(`ayanamsa.${s.ayanamsa}.note`)
  const nodeOptions = NODE_OPTIONS.map((o) => ({ value: o.value, label: t(`node.${o.value}`) }))
  const yearOptions = YEAR_MODEL_OPTIONS.map((o) => ({ value: o.value, label: t(`yearModel.${o.value}`) }))
  return (
    <Page width="narrow">
      <SectionHeader level={1} eyebrow={t('menu.settings')} title={t('settings.title')} description={t('settings.description')} />

      <div className="mt-8 space-y-6">
        <SettingsCard title={t('settings.language')} description={t('settings.languageText')}>
          <Row label={t('lang.label')} htmlFor="language" note={t('settings.languageNote')} last>
            {() => (
              <Select id="language" value={s.language} onChange={(e) => updateSettings({ language: e.target.value as LanguagePreference })}>
                <option value="auto">{t('lang.auto')} · {LANG_INFO[lang].native}</option>
                {LANGS.map((l) => <option key={l} value={l} lang={LANG_INFO[l].tag}>{LANG_INFO[l].native}{l === 'en' ? '' : ` (${LANG_INFO[l].english})`}</option>)}
              </Select>
            )}
          </Row>
        </SettingsCard>

        <SettingsCard title={t('settings.calculation')} description={t('settings.calculationText')}>
          <Row label={t('settings.preset')} note={t(`preset.${s.preset}.note`)}>
            {(labelId) => (
              <SegmentedControl<PresetName>
                aria-labelledby={labelId}
                fullWidth
                value={s.preset}
                onValueChange={(preset) => updateSettings({ preset })}
                options={[
                  { value: 'popular', label: t('preset.popular'), icon: <Sparkles aria-hidden /> },
                  { value: 'book', label: <>{t('preset.book')}<span className="max-sm:hidden"> {t('preset.bookRao')}</span></>, icon: <BookOpen aria-hidden /> },
                  { value: 'custom', label: t('preset.custom'), icon: <SlidersHorizontal aria-hidden /> },
                ]}
              />
            )}
          </Row>
          <Row label={t('settings.ayanamsa')} note={ayanamsaNote} htmlFor="ayanamsa">
            {() => (
              <Select id="ayanamsa" value={s.ayanamsa} onChange={(e) => updateSettings({ ayanamsa: e.target.value as typeof s.ayanamsa })}>
                {AYANAMSA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(`ayanamsa.${o.value}`)}</option>)}
              </Select>
            )}
          </Row>
          <Row label={t('settings.nodes')} note={t(`node.${s.node}.note`)}>
            {(labelId) => (
              <SegmentedControl aria-labelledby={labelId} fullWidth value={s.node} onValueChange={(node) => updateSettings({ node })} options={nodeOptions} />
            )}
          </Row>
          <Row label={t('settings.dashaYear')} note={t(`yearModel.${s.yearModel}.note`)} last>
            {(labelId) => (
              <SegmentedControl aria-labelledby={labelId} fullWidth value={s.yearModel} onValueChange={(yearModel) => updateSettings({ yearModel })} options={yearOptions} />
            )}
          </Row>
        </SettingsCard>

        <SettingsCard title={t('settings.appearance')}>
          <Row label={t('chart.style')} note={t('settings.chartStyleNote')}>
            {(labelId) => <ChartStylePicker labelId={labelId} value={s.chartStyle} />}
          </Row>
          <Row label={t('settings.theme')} note={t('settings.themeNote')} last>
            {(labelId) => (
              <SegmentedControl
                aria-labelledby={labelId}
                fullWidth
                value={s.theme}
                onValueChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'dark', label: t('settings.dark'), icon: <Moon aria-hidden /> },
                  { value: 'light', label: t('settings.light'), icon: <Sun aria-hidden /> },
                  { value: 'system', label: t('settings.system'), icon: <Monitor aria-hidden /> },
                ]}
              />
            )}
          </Row>
        </SettingsCard>

        <SettingsCard title={t('settings.data')} description={t('settings.dataText')}>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={resetSettings}>
              <RotateCcw aria-hidden /> {t('settings.reset')}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="danger" disabled={profiles.length === 0}>
                  <Trash aria-hidden /> {t('settings.deleteAll')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>{t('settings.deleteAllTitle', { n: profiles.length })}</DialogTitle>
                <DialogDescription>{t('settings.deleteAllText')}</DialogDescription>
                <DialogFooter>
                  <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
                  <DialogClose asChild><Button variant="danger" onClick={deleteAllProfiles}>{t('settings.deleteAllConfirm')}</Button></DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </SettingsCard>
      </div>
    </Page>
  )
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="sm:p-7">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  )
}

/** One setting: label, control and a one-line explanation. */
function Row({ label, note, htmlFor, last, children }: { label: string; note?: string; htmlFor?: string; last?: boolean; children: (labelId: string) => ReactNode }) {
  const labelId = useId()
  return (
    <div className={cn('space-y-2.5', !last && 'mb-6 border-b border-[var(--divider)] pb-6')}>
      <Label id={labelId} htmlFor={htmlFor}>{label}</Label>
      {children(labelId)}
      {note && <p className="text-[0.8rem] leading-snug text-[var(--text-muted)]">{note}</p>}
    </div>
  )
}

function ChartStylePicker({ labelId, value }: { labelId: string; value: ChartStyle }) {
  const { t } = useT()
  return (
    <RadioGroup.Root aria-labelledby={labelId} value={value} onValueChange={(v) => updateSettings({ chartStyle: v as ChartStyle })} className="grid grid-cols-2 gap-3">
      {(['north', 'south'] as const).map((style) => (
        <RadioGroup.Item
          key={style}
          value={style}
          className={cn(
            'group flex flex-col items-center gap-3 rounded-2xl border p-4 text-sm font-medium transition-colors',
            'border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]',
            'data-[state=checked]:border-[var(--accent)] data-[state=checked]:bg-[var(--selected-bg)] data-[state=checked]:text-[var(--accent-text)]',
          )}
        >
          <ChartGlyph style={style} />
          {t(style === 'north' ? 'chart.northIndian' : 'chart.southIndian')}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}

/** Miniature chart outlines for the style picker. */
function ChartGlyph({ style }: { style: ChartStyle }) {
  return (
    <svg viewBox="0 0 60 60" className="size-16 sm:size-20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="2" y="2" width="56" height="56" rx="3" />
      {style === 'north' ? (
        <path d="M2 2l56 56M58 2L2 58M30 2L58 30 30 58 2 30z" />
      ) : (
        <path d="M2 16h56M2 44h56M16 2v56M44 2v56M30 2v14M30 44v14M2 30h14M44 30h14" />
      )}
    </svg>
  )
}
