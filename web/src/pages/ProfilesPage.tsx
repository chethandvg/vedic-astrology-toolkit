// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { ArrowRight, Download, MapPin, Pencil, Trash, Upload, UserPlus, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'wouter'
import { useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { birthFileName, parseToolkitBirth, toToolkitBirth } from '@/state/birthJson'
import { createProfile, deleteProfile, profileName, useProfiles, type Profile } from '@/state/profiles'
import { calcSettings, useSettings } from '@/state/settings'
import { Button } from '@/ui/components/Button'
import { Callout } from '@/ui/components/Callout'
import { Card } from '@/ui/components/Card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/ui/components/Dialog'
import { EmptyState } from '@/ui/components/EmptyState'
import { SectionHeader } from '@/ui/components/SectionHeader'
import { Tooltip } from '@/ui/components/Tooltip'
import { Avatar } from '@/ui/layout/ProfileSwitcher'
import { civilDate } from '@/ui/forecast/dates'
import { Page } from '@/ui/layout/Page'

/** "28 Apr 1990, 05:50" from the stored civil date and time. */
const formatBirth = (p: Profile): string => `${civilDate(p.birth.date)}, ${p.birth.time}`

function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

type Message = { tone: 'info' | 'error'; text: string }

export default function ProfilesPage() {
  const { t } = useT()
  useDocumentTitle(pageTitle(t('menu.profiles')))
  const profiles = useProfiles()
  const settings = useSettings()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null)

  async function importFile(file: File) {
    try {
      let json: unknown
      try {
        json = JSON.parse(await file.text())
      } catch {
        throw new Error(t('profiles.notJson'))
      }
      const profile = createProfile(parseToolkitBirth(json))
      setMessage({ tone: 'info', text: t('profiles.imported', { name: profileName(profile) }) })
    } catch (e) {
      setMessage({ tone: 'error', text: t('profiles.importFailed', { file: file.name, reason: e instanceof Error ? e.message : t('profiles.unreadable') }) })
    }
  }

  function exportProfile(p: Profile) {
    saveFile(birthFileName(p.birth), `${JSON.stringify(toToolkitBirth(p.birth, calcSettings(settings)), null, 2)}\n`)
  }

  const importButton = (
    <Button variant="secondary" onClick={() => fileInput.current?.click()}>
      <Upload aria-hidden /> {t('profiles.import')}
    </Button>
  )

  return (
    <Page>
      <SectionHeader
        level={1}
        eyebrow={t('menu.profiles')}
        title={t('profiles.title')}
        description={t('profiles.description')}
        action={
          profiles.length > 0 && (
            <>
              {importButton}
              <Button asChild>
                <Link href="/new"><UserPlus aria-hidden /> {t('profiles.new')}</Link>
              </Button>
            </>
          )
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importFile(file)
          e.target.value = ''
        }}
      />

      <div aria-live="polite">
        {message && <Callout tone={message.tone === 'error' ? 'error' : 'info'} className="mt-6">{message.text}</Callout>}
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Users}
          title={t('profiles.empty')}
          description={t('profiles.emptyText')}
          action={
            <>
              <Button asChild><Link href="/new"><UserPlus aria-hidden /> {t('menu.add')}</Link></Button>
              {importButton}
            </>
          }
        />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar profile={p} className="size-11 text-sm" />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold tracking-tight">{profileName(p)}</h2>
                    <p className="text-sm text-[var(--text-muted)]">{formatBirth(p)}</p>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">{p.birth.place || `${p.birth.latitude.toFixed(4)}, ${p.birth.longitude.toFixed(4)}`} · {p.birth.timeZone}</span>
                </p>
                <div className="mt-auto flex items-center gap-1 border-t border-[var(--divider)] pt-4">
                  <Button asChild size="sm" className="mr-auto h-11 sm:h-9">
                    <Link href={`/p/${p.id}/today`}>{t('profiles.open')} <ArrowRight aria-hidden /></Link>
                  </Button>
                  <Tooltip content={t('common.edit')}>
                    <Button asChild variant="ghost" size="icon" aria-label={t('profiles.editAria', { name: profileName(p) })}>
                      <Link href={`/p/${p.id}/edit`}><Pencil /></Link>
                    </Button>
                  </Tooltip>
                  <Tooltip content={t('profiles.export')}>
                    <Button variant="ghost" size="icon" aria-label={t('profiles.exportAria', { name: profileName(p) })} onClick={() => exportProfile(p)}>
                      <Download />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t('common.delete')}>
                    <Button variant="ghost" size="icon" aria-label={t('profiles.deleteAria', { name: profileName(p) })} className="hover:text-[var(--bad-fg)]" onClick={() => setPendingDelete(p)}>
                      <Trash />
                    </Button>
                  </Tooltip>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
        {t('profiles.exportNote')}
      </p>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogTitle>{t('profiles.deleteTitle', { name: pendingDelete ? profileName(pendingDelete) : '' })}</DialogTitle>
          <DialogDescription>
            {t('profiles.deleteText')}
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t('profiles.keep')}</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingDelete) deleteProfile(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              <Trash aria-hidden /> {t('profiles.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
