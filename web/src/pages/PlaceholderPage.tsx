// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Hourglass, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { useT } from '@/i18n'
import { pageTitle, useDocumentTitle } from '@/lib/documentTitle'
import { Button } from '@/ui/components/Button'
import { EmptyState } from '@/ui/components/EmptyState'
import { Page } from '@/ui/layout/Page'

export interface PlaceholderPageProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
}

/** Stand-in for a page that is not built yet (or a route that does not exist). */
export default function PlaceholderPage({ title, description, icon = Hourglass }: PlaceholderPageProps) {
  const { t } = useT()
  useDocumentTitle(pageTitle(title))
  return (
    <Page width="narrow">
      <EmptyState
        icon={icon}
        title={title}
        description={description ?? t('app.placeholder')}
        action={
          <Button asChild variant="secondary">
            <Link href="/">{t('app.backHome')}</Link>
          </Button>
        }
      />
    </Page>
  )
}
